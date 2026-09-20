import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyTransaction, createSubscription, refundTransaction, TRIAL_DAYS } from '@/lib/paystack';

const TRANSFER_ACCESS_DAYS = 30;

// Confirms a checkout the client just completed via the Paystack popup.
// Three payment purposes are handled very differently:
//
//   'card_verification' — a small refundable charge used only to capture
//     a reusable card authorization for a shop using its free trial. On
//     success, the charge is immediately refunded, a 30-day free trial is
//     granted, and a real subscription is scheduled to start auto-billing
//     ₦10,000/month right when the trial ends.
//
//   'card_subscription' — the REAL subscription amount, charged
//     immediately (no free trial — this shop has already used its trial,
//     or is resuming after a lapsed one). Saves the reusable card
//     authorization onto the shop and schedules the recurring
//     subscription to start billing again in 1 month — the charge just
//     made covers the current month (Paystack auto-debits from month 2
//     onward).
//
//   'subscription_transfer' — the REAL subscription amount, paid via bank
//     transfer. There is no reusable authorization from a transfer, so
//     nothing is scheduled/auto-debited — the shop simply gets 30 days of
//     access and must pay again manually before it lapses. Note: transfers
//     can also complete asynchronously after the customer has closed this
//     tab, in which case the webhook (not this route) is what actually
//     credits the payment — see /api/paystack/webhook.
//
// (A free trial via transfer never reaches this route at all — it's
// granted directly by /api/paystack/initialize since there's nothing to
// verify for a ₦0 charge.)
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get('reference');
  if (!reference) {
    return NextResponse.json({ error: 'Missing reference.' }, { status: 400 });
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { data: payment } = await supabase
    .from('sx_payments')
    .select('id, shop_id, status, purpose')
    .eq('reference', reference)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
  }

  // Already processed (e.g. user refreshed the page, or the webhook beat
  // us to it for a transfer payment) — just report success.
  if (payment.status === 'success' || payment.status === 'refunded') {
    return NextResponse.json({ status: 'success' });
  }

  try {
    const result = await verifyTransaction(reference);
    const tx = result.data;

    if (tx.status !== 'success') {
      await admin.from('sx_payments').update({ status: 'failed' }).eq('id', payment.id);
      return NextResponse.json({ status: 'failed' }, { status: 200 });
    }

    if (payment.purpose === 'subscription_transfer') {
      const accessUntil = new Date();
      accessUntil.setDate(accessUntil.getDate() + TRANSFER_ACCESS_DAYS);

      await admin
        .from('sx_payments')
        .update({ status: 'success', paid_at: new Date().toISOString(), paystack_transaction_id: String(tx.id) })
        .eq('id', payment.id);

      await admin
        .from('sx_shops')
        .update({
          subscription_status: 'active',
          billing_method: 'transfer',
          paystack_customer_code: tx.customer.customer_code,
          next_billing_at: accessUntil.toISOString(),
        })
        .eq('id', payment.shop_id);

      return NextResponse.json({ status: 'success' });
    }

    if (payment.purpose === 'card_verification') {
      let refundStatus: 'refunded' | 'success' = 'success';
      try {
        await refundTransaction(tx.id);
        refundStatus = 'refunded';
      } catch {
        // Refund failed/couldn't be confirmed — the trial still starts (the
        // customer shouldn't be blocked by this), the ₦50 can be refunded
        // manually later from the Paystack dashboard if needed.
      }

      await admin
        .from('sx_payments')
        .update({
          status: refundStatus,
          paid_at: new Date().toISOString(),
          paystack_transaction_id: String(tx.id),
          authorization_code: tx.authorization.authorization_code,
        })
        .eq('id', payment.id);

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

      let subscriptionCode: string | null = null;
      let emailToken: string | null = null;
      try {
        const sub = await createSubscription({
          customerCode: tx.customer.customer_code,
          authorizationCode: tx.authorization.authorization_code,
          startDate: trialEndsAt,
        });
        subscriptionCode = sub.data.subscription_code;
        emailToken = sub.data.email_token;
      } catch {
        // Subscription scheduling failed — the trial still starts; this can
        // be retried/reconciled manually before the trial ends.
      }

      await admin
        .from('sx_shops')
        .update({
          subscription_status: 'trialing',
          billing_method: 'card',
          paystack_customer_code: tx.customer.customer_code,
          paystack_authorization_code: tx.authorization.authorization_code,
          paystack_subscription_code: subscriptionCode,
          paystack_email_token: emailToken,
          cancel_at_period_end: false,
          trial_ends_at: trialEndsAt.toISOString(),
          next_billing_at: trialEndsAt.toISOString(),
        })
        .eq('id', payment.shop_id);

      return NextResponse.json({ status: 'success' });
    }

    await admin
      .from('sx_payments')
      .update({
        status: 'success',
        paid_at: new Date().toISOString(),
        paystack_transaction_id: String(tx.id),
        authorization_code: tx.authorization.authorization_code,
      })
      .eq('id', payment.id);

    // Real (non-trial) card charge: the charge just made covers the period
    // starting now through 1 month from now. The subscription is scheduled
    // to make its first auto-debit at that point, covering month 2 onward.
    const nextBillingAt = new Date();
    nextBillingAt.setMonth(nextBillingAt.getMonth() + 1);

    let subscriptionCode: string | null = null;
    let emailToken: string | null = null;
    try {
      const sub = await createSubscription({
        customerCode: tx.customer.customer_code,
        authorizationCode: tx.authorization.authorization_code,
        startDate: nextBillingAt,
      });
      subscriptionCode = sub.data.subscription_code;
      emailToken = sub.data.email_token;
    } catch {
      // Subscription scheduling failed — the card is still verified, saved,
      // and charged, so this can be retried later without re-charging the
      // customer. Billing dates are still recorded below.
    }

    await admin
      .from('sx_shops')
      .update({
        subscription_status: 'active',
        billing_method: 'card',
        paystack_customer_code: tx.customer.customer_code,
        paystack_authorization_code: tx.authorization.authorization_code,
        paystack_subscription_code: subscriptionCode,
        paystack_email_token: emailToken,
        cancel_at_period_end: false,
        trial_ends_at: null,
        next_billing_at: nextBillingAt.toISOString(),
      })
      .eq('id', payment.shop_id);

    return NextResponse.json({ status: 'success' });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Verification failed.' },
      { status: 500 }
    );
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyTransaction, refundTransaction, createSubscription } from '@/lib/paystack';

const TRIAL_DAYS = 30;
const TRANSFER_ACCESS_DAYS = 30;

// Confirms a checkout the client just completed via the Paystack popup.
// Two payment purposes are handled very differently:
//
//   'card_verification' — a refundable ₦50 charge. Saves the reusable
//     card authorization onto the shop, refunds the charge, and
//     schedules the real ₦10,000/month subscription to start once the
//     free trial ends (Paystack auto-debits from here on).
//
//   'subscription_transfer' — the REAL ₦10,000, paid via bank transfer.
//     There is no reusable authorization from a transfer, so nothing is
//     scheduled/auto-debited and nothing is refunded (this is real
//     revenue) — the shop simply gets 30 days of access and must pay
//     again manually before it lapses. Note: transfers can also complete
//     asynchronously after the customer has closed this tab, in which
//     case the webhook (not this route) is what actually credits the
//     payment — see /api/paystack/webhook.
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

    await admin
      .from('sx_payments')
      .update({
        status: 'success',
        paid_at: new Date().toISOString(),
        paystack_transaction_id: String(tx.id),
        authorization_code: tx.authorization.authorization_code,
      })
      .eq('id', payment.id);

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    let subscriptionCode: string | null = null;
    try {
      const sub = await createSubscription({
        customerCode: tx.customer.customer_code,
        authorizationCode: tx.authorization.authorization_code,
        startDate: trialEndsAt,
      });
      subscriptionCode = sub.data.subscription_code;
    } catch {
      // Subscription scheduling failed — the card is still verified and
      // saved, so this can be retried later without re-charging the
      // customer. Trial dates are still recorded below.
    }

    await admin
      .from('sx_shops')
      .update({
        subscription_status: 'trialing',
        billing_method: 'card',
        paystack_customer_code: tx.customer.customer_code,
        paystack_authorization_code: tx.authorization.authorization_code,
        paystack_subscription_code: subscriptionCode,
        trial_ends_at: trialEndsAt.toISOString(),
        next_billing_at: trialEndsAt.toISOString(),
      })
      .eq('id', payment.shop_id);

    // Best-effort refund of the verification charge — it was never meant
    // to be kept. Don't fail the whole flow if this errors; the customer
    // already has full access via the trial.
    try {
      await refundTransaction(tx.id);
      await admin.from('sx_payments').update({ status: 'refunded' }).eq('id', payment.id);
    } catch {
      // Refund can be retried manually from the Paystack dashboard.
    }

    return NextResponse.json({ status: 'success' });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Verification failed.' },
      { status: 500 }
    );
  }
}

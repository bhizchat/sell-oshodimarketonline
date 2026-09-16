import { NextResponse, type NextRequest } from 'next/server';
import { verifyWebhookSignature } from '@/lib/paystack';
import { createAdminClient } from '@/lib/supabase/admin';

// Paystack webhook — the source of truth for recurring subscription
// billing (the client-side /verify call only ever handles the initial
// card-verification charge). Paystack recommends webhooks precisely
// because a customer's browser callback can fail to fire even though
// the charge succeeded, so recurring charges/failures/cancellations are
// only ever trusted from here.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const supabase = createAdminClient();

  switch (event.event) {
    case 'charge.success': {
      const data = event.data;
      const planCode = data.plan?.plan_code;
      const purpose = data.metadata?.purpose;

      // Bank-transfer subscription payments (see /api/paystack/initialize
      // + /verify) — handled here because a transfer can complete several
      // minutes after the customer left the checkout tab, so the
      // browser-side /verify call may never run. This is the ONLY
      // reliable confirmation path for that payment, per Paystack's own
      // recommendation to rely on webhooks for transfer payments.
      if (purpose === 'subscription_transfer') {
        const reference = data.reference;
        const { data: payment } = await supabase
          .from('sx_payments')
          .select('id, shop_id, status')
          .eq('reference', reference)
          .maybeSingle();

        // Already credited by /verify or a duplicate webhook delivery —
        // Paystack can and does resend webhooks, so this must be a no-op.
        if (payment && payment.status !== 'success') {
          const accessUntil = new Date();
          accessUntil.setDate(accessUntil.getDate() + 30);

          await supabase
            .from('sx_payments')
            .update({ status: 'success', paid_at: new Date().toISOString(), paystack_transaction_id: String(data.id) })
            .eq('id', payment.id);

          await supabase
            .from('sx_shops')
            .update({
              subscription_status: 'active',
              billing_method: 'transfer',
              paystack_customer_code: data.customer?.customer_code || null,
              next_billing_at: accessUntil.toISOString(),
            })
            .eq('id', payment.shop_id);
        }
        break;
      }

      // Only recurring subscription charges get to this branch — the
      // one-off ₦50 verification charge is confirmed via /api/paystack/verify
      // instead, using the browser's own callback.
      if (planCode && planCode === process.env.PAYSTACK_PLAN_CODE) {
        const customerCode = data.customer?.customer_code;
        const { data: shop } = await supabase
          .from('sx_shops')
          .select('id')
          .eq('paystack_customer_code', customerCode)
          .maybeSingle();

        if (shop) {
          const nextBilling = new Date();
          nextBilling.setMonth(nextBilling.getMonth() + 1);

          await supabase
            .from('sx_shops')
            .update({ subscription_status: 'active', next_billing_at: nextBilling.toISOString() })
            .eq('id', shop.id);

          await supabase.from('sx_payments').insert({
            shop_id: shop.id,
            reference: data.reference,
            amount: data.amount,
            status: 'success',
            purpose: 'subscription_charge',
            paystack_transaction_id: String(data.id),
            authorization_code: data.authorization?.authorization_code || null,
            paid_at: new Date().toISOString(),
          });
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const customerCode = event.data.customer?.customer_code;
      if (customerCode) {
        await supabase
          .from('sx_shops')
          .update({ subscription_status: 'past_due' })
          .eq('paystack_customer_code', customerCode);
      }
      break;
    }

    case 'subscription.disable':
    case 'subscription.not_renew': {
      // Marks the subscription as not-renewing without immediately
      // revoking access — the shop keeps access until trial_ends_at /
      // next_billing_at naturally passes (hasActiveAccess() in lib/shop.ts
      // already enforces that date regardless of subscription_status).
      // This mirrors what /api/paystack/cancel-subscription does when the
      // owner cancels from our own UI, and also covers the case where a
      // subscription is disabled directly from the Paystack dashboard.
      const customerCode = event.data.customer?.customer_code;
      if (customerCode) {
        await supabase
          .from('sx_shops')
          .update({ cancel_at_period_end: true })
          .eq('paystack_customer_code', customerCode);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

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
      const customerCode = event.data.customer?.customer_code;
      if (customerCode) {
        await supabase
          .from('sx_shops')
          .update({ subscription_status: 'canceled' })
          .eq('paystack_customer_code', customerCode);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

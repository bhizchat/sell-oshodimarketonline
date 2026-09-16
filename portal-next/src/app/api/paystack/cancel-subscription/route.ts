import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveShopContext } from '@/lib/shop';
import { disableSubscription } from '@/lib/paystack';

// Lets a card-paying shop owner cancel their recurring subscription from
// Payments & Billing. This only stops FUTURE billing — the shop keeps
// full access for the rest of the period they already paid for (see
// sx-subscription-cancel-schema.sql), matching the UI's existing promise
// ("you can cancel anytime before <date> to avoid being charged").
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const shop = await resolveShopContext(supabase, user);
  if (!shop || !shop.shopId) {
    return NextResponse.json({ error: 'Shop not found.' }, { status: 404 });
  }
  if (shop.isStaff) {
    return NextResponse.json({ error: 'Only the shop owner can manage billing.' }, { status: 403 });
  }
  if (shop.billingMethod !== 'card') {
    return NextResponse.json({ error: 'No card subscription to cancel.' }, { status: 400 });
  }
  if (shop.cancelAtPeriodEnd) {
    return NextResponse.json({ status: 'already_canceled' });
  }
  if (!shop.paystackSubscriptionCode || !shop.paystackEmailToken) {
    return NextResponse.json({ error: 'No active subscription found to cancel.' }, { status: 400 });
  }

  try {
    await disableSubscription({
      subscriptionCode: shop.paystackSubscriptionCode,
      emailToken: shop.paystackEmailToken,
    });

    const admin = createAdminClient();
    await admin.from('sx_shops').update({ cancel_at_period_end: true }).eq('id', shop.shopId);

    return NextResponse.json({ status: 'canceled' });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not cancel subscription.' },
      { status: 500 }
    );
  }
}

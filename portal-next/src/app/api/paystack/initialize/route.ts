import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveShopContext } from '@/lib/shop';
import { initializeTransaction, CARD_VERIFICATION_AMOUNT_KOBO, SUBSCRIPTION_AMOUNT_KOBO, TRIAL_DAYS } from '@/lib/paystack';

// Starts checkout: only the shop OWNER can initiate billing (staff share
// the owner's subscription, they never pay separately).
//
// Every shop gets exactly ONE free 30-day trial, the first time it ever
// sets up billing (`subscription_status === 'none'`) — after that, every
// payment is the real ₦10,000 subscription amount, charged immediately.
//
// Two methods are supported (chosen by the client via body.method):
//   'card'     (default) — while trial-eligible, this only charges a
//               small refundable ₦50 verification charge to capture a
//               reusable card authorization, then starts the 30-day trial
//               (see /verify, which refunds the charge and schedules the
//               real ₦10,000/month auto-debit to begin once the trial
//               ends). Once the trial has been used, this instead charges
//               the real ₦10,000 immediately (no refund) and reschedules
//               a fresh subscription starting next month.
//   'transfer' — while trial-eligible, this doesn't touch Paystack at all
//               (there's no such thing as a ₦0 bank transfer) — it just
//               grants the shop 30 days of free access directly. Once the
//               trial has been used (or has lapsed), this instead charges
//               the REAL ₦10,000 up front via Paystack's "Pay with
//               Transfer" channel. There's no reusable authorization from
//               a transfer, so this always grants exactly 30 days of
//               access with no auto-renewal — the shop must come back and
//               pay again next month.
export async function POST(request: Request) {
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

  const email = user.email;
  if (!email) {
    return NextResponse.json({ error: 'Your account has no email on file.' }, { status: 400 });
  }

  let body: { method?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const method = body.method === 'transfer' ? 'transfer' : 'card';
  const isTransfer = method === 'transfer';
  const isTrialEligible = shop.subscriptionStatus === 'none';

  // Free trial via bank transfer: nothing to charge, so skip Paystack
  // entirely and grant access directly. `next_billing_at` is set (in
  // addition to `trial_ends_at`) purely so the transfer-reminder cron
  // (which only looks at next_billing_at) still emails this shop before
  // its trial runs out.
  if (isTransfer && isTrialEligible) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    const { error: trialError } = await createAdminClient()
      .from('sx_shops')
      .update({
        subscription_status: 'trialing',
        billing_method: 'transfer',
        trial_ends_at: trialEndsAt.toISOString(),
        next_billing_at: trialEndsAt.toISOString(),
        cancel_at_period_end: false,
      })
      .eq('id', shop.shopId);

    if (trialError) {
      return NextResponse.json({ error: 'Could not start your free trial. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ trialStarted: true });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;

  const reference = `sx_${isTransfer ? 'transfer' : 'card'}_${shop.shopCode || shop.shopId}_${Date.now()}`;
  const amountKobo = !isTransfer && isTrialEligible ? CARD_VERIFICATION_AMOUNT_KOBO : SUBSCRIPTION_AMOUNT_KOBO;
  const purpose = isTransfer ? 'subscription_transfer' : isTrialEligible ? 'card_verification' : 'card_subscription';

  try {
    const result = await initializeTransaction({
      email,
      amountKobo,
      reference,
      metadata: { shop_id: shop.shopId, shop_code: shop.shopCode, purpose },
      callbackUrl: `${siteUrl}/payments-billing`,
      channels: isTransfer ? ['bank_transfer'] : undefined,
    });

    const { error: insertError } = await createAdminClient().from('sx_payments').insert({
      shop_id: shop.shopId,
      shop_code: shop.shopCode,
      user_id: user.id,
      reference,
      amount: amountKobo,
      status: 'pending',
      purpose,
    });

    if (insertError) {
      return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({
      accessCode: result.data.access_code,
      reference: result.data.reference,
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not start checkout.' },
      { status: 500 }
    );
  }
}

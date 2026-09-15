import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveShopContext } from '@/lib/shop';
import { initializeTransaction, CARD_VERIFICATION_AMOUNT_KOBO, SUBSCRIPTION_AMOUNT_KOBO } from '@/lib/paystack';

// Starts checkout: only the shop OWNER can initiate billing (staff share
// the owner's subscription, they never pay separately).
//
// Two methods are supported (chosen by the client via body.method):
//   'card'     (default) — a small refundable ₦50 verification charge,
//               whose reusable card authorization is used to schedule a
//               real recurring ₦10,000/month subscription (see /verify).
//   'transfer' — the REAL ₦10,000 charged up front via Paystack's
//               "Pay with Transfer" channel. There's no reusable
//               authorization from a transfer, so this grants exactly
//               30 days of access with no auto-renewal — the shop must
//               come back and pay again next month.
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;

  const isTransfer = method === 'transfer';
  const reference = `sx_${isTransfer ? 'transfer' : 'verify'}_${shop.shopCode || shop.shopId}_${Date.now()}`;
  const amountKobo = isTransfer ? SUBSCRIPTION_AMOUNT_KOBO : CARD_VERIFICATION_AMOUNT_KOBO;
  const purpose = isTransfer ? 'subscription_transfer' : 'card_verification';

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

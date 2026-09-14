import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveShopContext } from '@/lib/shop';
import { initializeTransaction, CARD_VERIFICATION_AMOUNT_KOBO } from '@/lib/paystack';

// Starts checkout: only the shop OWNER can initiate billing (staff share
// the owner's subscription, they never pay separately). Creates a small
// refundable ₦50 verification transaction whose metadata links it back
// to this shop's shop_code, and logs a pending row in sx_payments.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const meta = (user.user_metadata as Record<string, unknown>) || {};
  const isStaff = meta.sx_shop_role === 'staff';
  if (isStaff) {
    return NextResponse.json({ error: 'Only the shop owner can manage billing.' }, { status: 403 });
  }

  const shop = await resolveShopContext(supabase, user);
  if (!shop || !shop.shopId) {
    return NextResponse.json({ error: 'Shop not found.' }, { status: 404 });
  }

  const email = user.email;
  if (!email) {
    return NextResponse.json({ error: 'Your account has no email on file.' }, { status: 400 });
  }

  const reference = `sx_${shop.shopCode || shop.shopId}_${Date.now()}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;

  try {
    const result = await initializeTransaction({
      email,
      amountKobo: CARD_VERIFICATION_AMOUNT_KOBO,
      reference,
      metadata: { shop_id: shop.shopId, shop_code: shop.shopCode, purpose: 'card_verification' },
      callbackUrl: `${siteUrl}/payments-billing`,
    });

    const { error: insertError } = await createAdminClient().from('sx_payments').insert({
      shop_id: shop.shopId,
      shop_code: shop.shopCode,
      user_id: user.id,
      reference,
      amount: CARD_VERIFICATION_AMOUNT_KOBO,
      status: 'pending',
      purpose: 'card_verification',
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

import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, buildTransferReminderEmail, type TransferReminderKind } from '@/lib/email';

// Daily cron job (see vercel.json) that emails "Pay with Transfer" shops
// as their 30-day access window approaches expiry. Card-paying shops are
// excluded entirely — Paystack auto-debits them, so they never need a
// manual "please renew" nudge (see sx-subscription-transfer-schema.sql).
//
// Auth: Vercel automatically sends `Authorization: Bearer <CRON_SECRET>`
// on requests it triggers for scheduled Cron Jobs when a CRON_SECRET env
// var is set, so checking it here blocks everyone else from hitting this
// (unauthenticated, GET) route and spamming shops with reminder emails.
export const dynamic = 'force-dynamic';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysUntil(target: Date, now: Date): number {
  return Math.round((target.getTime() - now.getTime()) / MS_PER_DAY);
}

function reminderKindForDaysLeft(daysLeft: number): TransferReminderKind | null {
  if (daysLeft === 7) return '7day';
  if (daysLeft === 3) return '3day';
  if (daysLeft === 0) return 'expiry';
  return null;
}

type ReminderResult = { shopId: string; kind: TransferReminderKind; sent: boolean };

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  const { data: shops, error } = await supabase
    .from('sx_shops')
    .select('id, owner_id, shop_name, next_billing_at')
    .eq('billing_method', 'transfer')
    .in('subscription_status', ['trialing', 'active'])
    .not('next_billing_at', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: ReminderResult[] = [];

  for (const shop of shops || []) {
    const nextBillingAt = shop.next_billing_at as string;
    const kind = reminderKindForDaysLeft(daysUntil(new Date(nextBillingAt), now));
    if (!kind) continue;

    // Already sent this exact reminder for this billing cycle (unique
    // constraint on shop_id + reminder_type + billing_cycle_at) — skip so
    // re-running the cron (or a slightly-off schedule) never double-sends.
    const { data: existing } = await supabase
      .from('sx_billing_reminders')
      .select('id')
      .eq('shop_id', shop.id)
      .eq('reminder_type', kind)
      .eq('billing_cycle_at', nextBillingAt)
      .maybeSingle();

    if (existing) continue;

    const { data: userData } = await supabase.auth.admin.getUserById(shop.owner_id as string);
    const email = userData?.user?.email;
    if (!email) continue;

    const dueDateLabel = new Date(nextBillingAt).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const payUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/payments-billing`;
    const { subject, html } = buildTransferReminderEmail(kind, shop.shop_name as string, dueDateLabel, payUrl);

    try {
      await sendEmail({ to: email, subject, html });
      await supabase.from('sx_billing_reminders').insert({
        shop_id: shop.id,
        reminder_type: kind,
        billing_cycle_at: nextBillingAt,
      });
      results.push({ shopId: shop.id as string, kind, sent: true });
    } catch (err) {
      console.error(`Failed to send ${kind} transfer reminder for shop ${shop.id}:`, err);
      results.push({ shopId: shop.id as string, kind, sent: false });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

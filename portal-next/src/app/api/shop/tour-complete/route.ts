import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveShopContext } from '@/lib/shop';

// Marks the one-time "Getting Started" dashboard tour as seen (or
// skipped) for the current shop owner, so it never auto-shows again.
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

  await createAdminClient()
    .from('sx_shops')
    .update({ has_seen_dashboard_tour: true })
    .eq('id', shop.shopId);

  return NextResponse.json({ status: 'ok' });
}

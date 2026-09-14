import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Service-role Supabase client — bypasses RLS entirely. ONLY use this in
// server-only code that never runs in the browser (Route Handlers like
// the Paystack webhook, which has no end-user session to authenticate
// with). Never import this from a Client Component or expose the
// service-role key to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

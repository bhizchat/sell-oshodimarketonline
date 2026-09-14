import { createBrowserClient } from '@supabase/ssr';

// The Supabase session cookie is not (and cannot be) httpOnly: the browser
// SDK needs to read it directly so client-side calls (uploads, table
// queries) can attach the access token. That means it's readable by any
// script running on the page, same as localStorage would be — the real
// defense against that is the Content-Security-Policy in next.config.ts,
// which stops injected/foreign scripts from running at all. We still
// force `secure` so the cookie is never sent over a plain HTTP connection.
const cookieOptions = {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

// Browser-side Supabase client, used inside Client Components. Mirrors
// the anon-key setup in the static site's sx-supabase-config.js — same
// Supabase project, just wired through @supabase/ssr so auth state is
// shared with the server via cookies instead of localStorage.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions }
  );
}

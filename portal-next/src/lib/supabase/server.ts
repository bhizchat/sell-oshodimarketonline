import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Kept in sync with client.ts — forces `secure` so the session cookie is
// never sent over a plain HTTP connection.
const cookieOptions = {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

// Server-side Supabase client, used inside Server Components / Route
// Handlers / Server Actions. Reads the auth session from cookies (set by
// middleware.ts) so pages can fetch shop/product/review data on the
// server BEFORE sending HTML to the browser — this is what makes the
// dashboard render fully populated on first paint instead of the
// client-side "await then repaint" pattern the static site uses.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore
            // since middleware.ts refreshes the session on every request.
          }
        },
      },
      cookieOptions,
    }
  );
}

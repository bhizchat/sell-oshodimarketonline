import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Kept in sync with client.ts/server.ts — forces `secure` so the session
// cookie is never sent over a plain HTTP connection.
const cookieOptions = {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

// Refreshes the Supabase auth session cookie on every request so it
// never silently expires mid-visit, and keeps server + browser clients
// in sync. Runs before every page/route matched below (see config.matcher
// in middleware.ts).
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      cookieOptions,
    }
  );

  // IMPORTANT: do not remove this call. It refreshes the session and
  // must run before any Server Component reads the user, otherwise users
  // can get randomly logged out.
  await supabase.auth.getUser();

  return supabaseResponse;
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp, loginEmailLimiter, loginIpLimiter } from '@/lib/rate-limit';

// Server-side login: the browser previously called
// supabase.auth.signInWithPassword() directly, which has no rate limiting
// of our own in front of it (relying only on whatever Supabase's GoTrue
// applies) and can't be throttled from a Next.js middleware since it never
// touches our origin. Routing sign-in through this endpoint lets us apply
// our own IP + per-email sliding-window limits before ever reaching
// Supabase, and sets the session cookie via the server client so it's
// available on the very next request.
export async function POST(request: Request) {
  const ip = getClientIp(request);

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = (body.email || '').trim();
  const password = body.password || '';
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const rateLimit = await checkRateLimit(loginIpLimiter, loginEmailLimiter, ip, email);
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Please wait a bit and try again.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Unable to sign in. Please check your details.' },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}

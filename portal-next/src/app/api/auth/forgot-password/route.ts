import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp, resetPasswordEmailLimiter, resetPasswordIpLimiter } from '@/lib/rate-limit';

// Server-side password-reset request: IP + per-email rate limited (this
// endpoint is otherwise a prime brute-force/enumeration target — it's
// unauthenticated and, by definition, exists to accept "guessed" emails).
// Always responds with the same generic message whether or not the email
// is registered, so the response itself can't be used to enumerate
// accounts.
export async function POST(request: Request) {
  const ip = getClientIp(request);

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = (body.email || '').trim();
  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const genericMessage = 'If an account exists for that email, a password reset link has been sent.';

  const rateLimit = await checkRateLimit(resetPasswordIpLimiter, resetPasswordEmailLimiter, ip, email);
  if (rateLimit.limited) {
    // Still don't reveal anything about the account — just slow the caller
    // down like a normal 429 would, without a distinct message that could
    // help an attacker distinguish "rate limited" from "sent".
    return NextResponse.json(
      { error: 'Too many requests. Please wait a bit and try again.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  });

  if (error) {
    // Never leak this to the client (would reveal account existence /
    // internals) — but DO log it server-side so delivery failures (SMTP
    // misconfiguration, Supabase's built-in mailer rate limit, etc.) are
    // visible in Vercel function logs instead of silently vanishing.
    console.error('[forgot-password] resetPasswordForEmail failed:', error.message);
  }

  return NextResponse.json({ ok: true, message: genericMessage });
}

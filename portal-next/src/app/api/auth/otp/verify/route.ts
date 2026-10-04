import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp, otpVerifyChallengeLimiter, otpVerifyIpLimiter } from '@/lib/rate-limit';
import { OTP_COOKIE, OTP_MAX_ATTEMPTS, hashCode, hashesMatch, loadActiveChallenge } from '@/lib/login-otp';

// Step 2 of 2: checks the emailed code and only then creates the session.
export async function POST(request: Request) {
  const ip = getClientIp(request);

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const code = (body.code || '').replace(/\D/g, '');
  if (code.length !== 6) {
    return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 });
  }

  const token = (await cookies()).get(OTP_COOKIE)?.value;
  const admin = createAdminClient();
  const challenge = token ? await loadActiveChallenge(admin, token) : null;
  if (!challenge) {
    return NextResponse.json({ error: 'Your code expired. Please sign in again.', restart: true }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(otpVerifyIpLimiter, otpVerifyChallengeLimiter, ip, challenge.id);
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a bit and try again.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json({ error: 'Too many incorrect codes. Please sign in again.', restart: true }, { status: 401 });
  }

  // Count the attempt before comparing. The `attempts` match makes parallel
  // guesses race: only one request wins the bump, the rest are rejected.
  const { data: bumped } = await admin
    .from('sx_login_challenges')
    .update({ attempts: challenge.attempts + 1 })
    .eq('id', challenge.id)
    .eq('attempts', challenge.attempts)
    .select('id')
    .maybeSingle();
  if (!bumped) {
    return NextResponse.json({ error: 'Please try again.' }, { status: 429 });
  }

  if (!hashesMatch(hashCode(code, challenge.id), challenge.code_hash)) {
    const remaining = OTP_MAX_ATTEMPTS - (challenge.attempts + 1);
    if (remaining <= 0) {
      return NextResponse.json({ error: 'Too many incorrect codes. Please sign in again.', restart: true }, { status: 401 });
    }
    return NextResponse.json(
      { error: `Incorrect code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} left.` },
      { status: 401 }
    );
  }

  // Single use: whoever flips consumed_at first gets the session.
  const { data: consumed } = await admin
    .from('sx_login_challenges')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', challenge.id)
    .is('consumed_at', null)
    .select('id')
    .maybeSingle();
  if (!consumed) {
    return NextResponse.json({ error: 'This code was already used. Please sign in again.', restart: true }, { status: 401 });
  }

  // Mint the session server-side: generateLink doesn't send an email, and
  // verifyOtp on the cookie-aware client stores the session in cookies.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: challenge.email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    console.error('[otp/verify] generateLink failed:', linkError?.message);
    return NextResponse.json({ error: 'Unable to complete sign-in. Please sign in again.', restart: true }, { status: 500 });
  }

  const supabase = await createClient();
  const { error: sessionError } = await supabase.auth.verifyOtp({ type: 'email', token_hash: tokenHash });
  if (sessionError) {
    console.error('[otp/verify] verifyOtp failed:', sessionError.message);
    return NextResponse.json({ error: 'Unable to complete sign-in. Please sign in again.', restart: true }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(OTP_COOKIE, '', { path: '/api/auth', maxAge: 0 });
  return response;
}

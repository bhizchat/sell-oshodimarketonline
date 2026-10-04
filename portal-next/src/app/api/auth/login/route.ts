import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  checkRateLimit,
  getClientIp,
  loginEmailLimiter,
  loginIpLimiter,
  otpSendEmailLimiter,
  otpSendIpLimiter,
} from '@/lib/rate-limit';
import {
  OTP_COOKIE,
  OTP_TTL_MS,
  generateOtpCode,
  hashCode,
  hashToken,
  maskEmail,
  newChallengeToken,
  otpCookieOptions,
  sendLoginOtpEmail,
} from '@/lib/login-otp';

// Step 1 of 2: checks the password, then emails a 6-digit code. NO session
// cookie is set here — the browser only receives an httpOnly challenge
// cookie, and the session is created by /api/auth/otp/verify once the code
// is entered. The password check uses a cookie-less client and the throwaway
// session it creates is revoked immediately (scope 'local' so the user's
// other devices stay signed in). Also keeps our own IP + per-email rate
// limits in front of Supabase.
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

  const verifier = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await verifier.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'Unable to sign in. Please check your details.' },
      { status: 401 }
    );
  }
  await verifier.auth.signOut({ scope: 'local' });

  const userEmail = data.user.email || email;

  const sendLimit = await checkRateLimit(otpSendIpLimiter, otpSendEmailLimiter, ip, userEmail);
  if (sendLimit.limited) {
    return NextResponse.json(
      { error: 'Too many code requests. Please wait a bit and try again.' },
      { status: 429, headers: { 'Retry-After': String(sendLimit.retryAfterSeconds) } }
    );
  }

  const admin = createAdminClient();
  const code = generateOtpCode();
  const token = newChallengeToken();
  const challengeId = randomUUID();

  // One live challenge per user, and drop long-expired rows while we're here.
  await admin.from('sx_login_challenges').delete().eq('user_id', data.user.id);
  await admin
    .from('sx_login_challenges')
    .delete()
    .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const { error: insertError } = await admin.from('sx_login_challenges').insert({
    id: challengeId,
    token_hash: hashToken(token),
    user_id: data.user.id,
    email: userEmail,
    code_hash: hashCode(code, challengeId),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });
  if (insertError) {
    console.error('[login] failed to create OTP challenge:', insertError.message);
    return NextResponse.json({ error: 'Unable to start sign-in. Please try again.' }, { status: 500 });
  }

  try {
    await sendLoginOtpEmail(userEmail, code);
  } catch (err) {
    console.error('[login] failed to send OTP email:', err);
    await admin.from('sx_login_challenges').delete().eq('id', challengeId);
    return NextResponse.json({ error: "We couldn't send your sign-in code. Please try again." }, { status: 500 });
  }

  const response = NextResponse.json({ otpRequired: true, maskedEmail: maskEmail(userEmail) });
  response.cookies.set(OTP_COOKIE, token, otpCookieOptions);
  return response;
}

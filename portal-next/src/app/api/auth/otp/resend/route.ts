import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp, otpSendEmailLimiter, otpSendIpLimiter } from '@/lib/rate-limit';
import {
  OTP_COOKIE,
  OTP_MAX_SENDS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_MS,
  generateOtpCode,
  hashCode,
  loadActiveChallenge,
  sendLoginOtpEmail,
} from '@/lib/login-otp';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const token = (await cookies()).get(OTP_COOKIE)?.value;
  const admin = createAdminClient();
  const challenge = token ? await loadActiveChallenge(admin, token) : null;

  if (!challenge) {
    return NextResponse.json({ error: 'Your session expired. Please sign in again.', restart: true }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(otpSendIpLimiter, otpSendEmailLimiter, ip, challenge.email);
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: 'Too many code requests. Please wait a bit and try again.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  if (challenge.send_count >= OTP_MAX_SENDS) {
    return NextResponse.json({ error: 'Too many codes sent. Please sign in again.', restart: true }, { status: 429 });
  }

  const sinceLastSend = (Date.now() - new Date(challenge.last_sent_at).getTime()) / 1000;
  if (sinceLastSend < OTP_RESEND_COOLDOWN_SECONDS) {
    const wait = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - sinceLastSend);
    return NextResponse.json(
      { error: `Please wait ${wait}s before requesting another code.`, retryAfterSeconds: wait },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    );
  }

  const code = generateOtpCode();
  const { error: updateError } = await admin
    .from('sx_login_challenges')
    .update({
      code_hash: hashCode(code, challenge.id),
      attempts: 0,
      send_count: challenge.send_count + 1,
      last_sent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    })
    .eq('id', challenge.id);

  if (updateError) {
    console.error('[otp/resend] update failed:', updateError.message);
    return NextResponse.json({ error: 'Unable to resend code. Please try again.' }, { status: 500 });
  }

  try {
    await sendLoginOtpEmail(challenge.email, code);
  } catch (err) {
    console.error('[otp/resend] failed to send OTP email:', err);
    return NextResponse.json({ error: "We couldn't send your code. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS });
}

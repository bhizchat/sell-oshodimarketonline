import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail, buildLoginOtpEmail } from '@/lib/email';

export const OTP_COOKIE = 'omo_login_challenge';
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS = 4;
export const OTP_RESEND_COOLDOWN_SECONDS = 45;

export type LoginChallenge = {
  id: string;
  user_id: string;
  email: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  send_count: number;
  last_sent_at: string;
  consumed_at: string | null;
};

export const otpCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: OTP_TTL_MS / 1000,
};

function hmacSecret(): string {
  const secret = process.env.OTP_HMAC_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('OTP_HMAC_SECRET (or SUPABASE_SERVICE_ROLE_KEY) is not configured.');
  return secret;
}

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function newChallengeToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Bound to the challenge id so a code can't be replayed against another challenge.
export function hashCode(code: string, challengeId: string): string {
  return createHmac('sha256', hmacSecret()).update(`${challengeId}:${code}`).digest('hex');
}

export function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'•'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

export async function loadActiveChallenge(admin: SupabaseClient, token: string): Promise<LoginChallenge | null> {
  const { data } = await admin
    .from('sx_login_challenges')
    .select('id, user_id, email, code_hash, expires_at, attempts, send_count, last_sent_at, consumed_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle();

  const challenge = data as LoginChallenge | null;
  if (!challenge || challenge.consumed_at) return null;
  if (new Date(challenge.expires_at).getTime() <= Date.now()) return null;
  return challenge;
}

export async function sendLoginOtpEmail(email: string, code: string): Promise<void> {
  const { subject, html } = buildLoginOtpEmail(code);
  await sendEmail({ to: email, subject, html });
}

'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import BrandPanel from '@/components/brand-panel';

// Sign-in page, ported 1:1 (layout/copy/assets) from the static site's
// sign-in.html so the new stack doesn't feel like a different product,
// wired to the SSR-aware browser client so the session lands in a cookie
// the server can read on the very next request.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  // Only allow same-origin relative paths (must start with a single "/",
  // never "//" or contain "://") so this can't be turned into an open
  // redirect by crafting a link like /login?next=https://evil.com or
  // ?next=//evil.com. Lets links like the transfer-reminder email's
  // "Renew with Bank Transfer" button send a signed-out user back to
  // /payments-billing after they log in, instead of always /dashboard.
  const rawNext = searchParams.get('next');
  const next =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('://') ? rawNext : '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'password' | 'otp'>('password');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  function backToPassword() {
    setStep('password');
    setCode('');
    setError(null);
    setInfo(null);
    setPassword('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error || 'Unable to sign in. Please check your details.');
      return;
    }
    if (result.otpRequired) {
      setMaskedEmail(result.maskedEmail || email);
      setStep('otp');
      setResendIn(45);
      return;
    }
    window.location.href = next;
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    const response = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const result = await response.json();
    if (!response.ok) {
      setSubmitting(false);
      setError(result.error || 'Unable to verify code.');
      if (result.restart) backToPasswordKeepError();
      else setCode('');
      return;
    }
    window.location.href = next;
  }

  function backToPasswordKeepError() {
    setStep('password');
    setCode('');
    setPassword('');
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    const response = await fetch('/api/auth/otp/resend', { method: 'POST' });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Unable to resend code.');
      if (result.restart) backToPasswordKeepError();
      else if (result.retryAfterSeconds) setResendIn(result.retryAfterSeconds);
      return;
    }
    setInfo('A new code has been sent.');
    setResendIn(result.cooldownSeconds || 45);
  }

  async function handleGoogleSignIn() {
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (oauthError) {
      setError(oauthError.message || 'Unable to continue with Google. Please try again.');
    }
  }

  return (
    <div className="flex min-h-screen">
      <BrandPanel />

      <section className="flex flex-1 items-center justify-center bg-white px-5 py-8 sm:px-8 sm:py-10">
        <div className="w-full max-w-[360px]">
          <div className="mb-2 flex flex-col items-center gap-2.5">
            <Image src="/assets/oshodi-logo.png" alt="Oshodi Market Online logo" width={220} height={56} className="h-auto w-45 object-contain sm:w-[220px]" />
          </div>

          <div className="mb-7 text-center">
            <h2 className="text-[1.25rem] font-extrabold text-[#1d2734]">
              Sell on Oshodi<span className="text-[#6c5ce7]"> Market Online</span>
            </h2>
            <p className="mt-1 text-[0.82rem] text-[#6b7280]">
              {step === 'otp' ? 'Enter the code we emailed you' : 'Sign in to continue to your account'}
            </p>
          </div>

          {step === 'otp' ? (
            <form onSubmit={handleVerify}>
              {error && (
                <div className="mb-3.5 rounded-lg border border-[#f3b9b9] bg-[#fdecec] px-3 py-2.5 text-[0.78rem] font-semibold text-[#9c2b2b]">
                  {error}
                </div>
              )}
              {info && (
                <div className="mb-3.5 rounded-lg border border-[#b7e4c7] bg-[#ecf9f0] px-3 py-2.5 text-[0.78rem] font-semibold text-[#1e6b3a]">
                  {info}
                </div>
              )}

              <p className="mb-4 text-center text-[0.82rem] text-[#6b7280]">
                We sent a 6-digit code to <strong className="text-[#1d2734]">{maskedEmail}</strong>. It expires in 10 minutes.
              </p>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                required
                placeholder="000000"
                aria-label="6-digit sign-in code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mb-4 w-full rounded-[10px] border border-[#dcdde0] bg-[#fbfbfc] py-3.5 text-center text-[1.5rem] font-extrabold tracking-[0.4em] text-[#1d2734] outline-none transition-colors placeholder:text-[#c9cacd] focus:border-[#6c5ce7] focus:bg-white"
              />

              <button
                type="submit"
                disabled={submitting || code.length !== 6}
                className="w-full rounded-[10px] bg-gradient-to-b from-[#4B2E83] to-[#392065] py-3.5 text-[0.9rem] font-extrabold tracking-wide text-white hover:from-[#5a3799] hover:to-[#2d1850] disabled:opacity-60"
              >
                {submitting ? 'Please wait…' : 'Verify & Sign In'}
              </button>

              <div className="mt-4 flex items-center justify-between text-[0.8rem]">
                <button type="button" onClick={backToPassword} className="font-bold text-[#6b7280] hover:text-[#1d2734]">
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendIn > 0}
                  className="font-bold text-[#4B2E83] disabled:text-[#a9aaad]"
                >
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </button>
              </div>
            </form>
          ) : (
          <>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-3.5 rounded-lg border border-[#f3b9b9] bg-[#fdecec] px-3 py-2.5 text-[0.78rem] font-semibold text-[#9c2b2b]">
                {error}
              </div>
            )}

            <div className="relative mb-3.5">
              <span className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2">
                <Image src="/assets/email.png" alt="" width={18} height={18} className="h-full w-full object-contain opacity-55" />
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[10px] border border-[#dcdde0] bg-[#fbfbfc] py-3.5 pl-[42px] pr-4 text-[0.88rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
              />
            </div>

            <div className="relative mb-3.5">
              <span className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2">
                <Image src="/assets/lock.png" alt="" width={18} height={18} className="h-full w-full object-contain opacity-55" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[10px] border border-[#dcdde0] bg-[#fbfbfc] py-3.5 pl-[42px] pr-[42px] text-[0.88rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2"
              >
                <Image src="/assets/visible.png" alt="" width={18} height={18} className="h-full w-full object-contain opacity-60" />
              </button>
            </div>

            <div className="mb-4.5 mt-1 flex items-center justify-between text-[0.78rem]">
              <label className="flex items-center gap-1.5 text-[#6b7280]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="accent-[#4B2E83]"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="font-bold text-[#4B2E83]">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-[10px] bg-gradient-to-b from-[#4B2E83] to-[#392065] py-3.5 text-[0.9rem] font-extrabold tracking-wide text-white hover:from-[#5a3799] hover:to-[#2d1850] disabled:opacity-60"
            >
              {submitting ? 'Please wait…' : 'Sign In'}
            </button>
          </form>

          <div className="my-5.5 flex items-center gap-3 text-[0.72rem] text-[#6b7280] before:h-px before:flex-1 before:bg-[#dcdde0] after:h-px after:flex-1 after:bg-[#dcdde0]">
            or continue with
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="mb-2.5 flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-[#dcdde0] bg-white py-2.75 text-[0.85rem] font-bold text-[#1d2734] hover:bg-[#f8f9fa]"
          >
            <Image src="/assets/google.png" alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
            Continue with Google
          </button>

          <p className="mt-5.5 text-center text-[0.82rem] text-[#6b7280]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-extrabold text-[#4B2E83]">
              Sign up
            </Link>
          </p>
          </>
          )}
        </div>
      </section>
    </div>
  );
}

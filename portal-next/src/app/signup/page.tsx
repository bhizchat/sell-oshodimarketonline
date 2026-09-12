'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import BrandPanel from '@/components/brand-panel';

// Sign-up page, ported 1:1 (layout/copy/assets) from the static site's
// signup.html. On success, Supabase sends a confirmation email (same
// emailRedirectTo pattern as the static site) — the account isn't fully
// active until that link is clicked, so we show a success message rather
// than redirecting straight to /dashboard.
export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setSubmitting(false);

    if (error) {
      setError(error.message || 'Unable to create account.');
      return;
    }
    setSuccess(true);
  }

  async function handleGoogleSignUp() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
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
              Create your Oshodi<span className="text-[#6c5ce7]"> Market Online</span> account
            </h2>
            <p className="mt-1 text-[0.82rem] text-[#6b7280]">Sign up to start selling or shopping local</p>
          </div>

          {success ? (
            <div className="rounded-[10px] border border-[#b7dfc4] bg-[#eaf6ee] p-3.5 text-center text-[0.82rem] font-semibold text-[#1e6b38]">
              Account created! Check your email to confirm your address, then sign in.
            </div>
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
                    <Image src="/assets/user.png" alt="" width={18} height={18} className="h-full w-full object-contain opacity-55" />
                  </span>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-[10px] border border-[#dcdde0] bg-[#fbfbfc] py-3.5 pl-[42px] pr-4 text-[0.88rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
                  />
                </div>

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
                    minLength={6}
                    autoComplete="new-password"
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

                <div className="relative mb-3.5">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2">
                    <Image src="/assets/lock.png" alt="" width={18} height={18} className="h-full w-full object-contain opacity-55" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-[10px] border border-[#dcdde0] bg-[#fbfbfc] py-3.5 pl-[42px] pr-4 text-[0.88rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
                  />
                </div>

                <label className="mb-4.5 flex items-start gap-2 text-[0.78rem] text-[#6b7280]">
                  <input
                    type="checkbox"
                    required
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 accent-[#4B2E83]"
                  />
                  <span>
                    I agree to the{' '}
                    <Link href="/terms" className="font-bold text-[#4B2E83]">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="font-bold text-[#4B2E83]">
                      Privacy Policy
                    </Link>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-[10px] bg-gradient-to-b from-[#4B2E83] to-[#392065] py-3.5 text-[0.9rem] font-extrabold tracking-wide text-white hover:from-[#5a3799] hover:to-[#2d1850] disabled:opacity-60"
                >
                  {submitting ? 'Please wait…' : 'Sign Up'}
                </button>
              </form>

              <div className="my-5.5 flex items-center gap-3 text-[0.72rem] text-[#6b7280] before:h-px before:flex-1 before:bg-[#dcdde0] after:h-px after:flex-1 after:bg-[#dcdde0]">
                or continue with
              </div>

              <button
                type="button"
                onClick={handleGoogleSignUp}
                className="mb-2.5 flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-[#dcdde0] bg-white py-2.75 text-[0.85rem] font-bold text-[#1d2734] hover:bg-[#f8f9fa]"
              >
                <Image src="/assets/google.png" alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
                Continue with Google
              </button>
            </>
          )}

          <p className="mt-5.5 text-center text-[0.82rem] text-[#6b7280]">
            Already have an account?{' '}
            <Link href="/login" className="font-extrabold text-[#4B2E83]">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import BrandPanel from '@/components/brand-panel';
import { createClient } from '@/lib/supabase/client';

// Landing page for the link sent by /api/auth/forgot-password. The
// Supabase browser client auto-detects the recovery token in the URL
// fragment (detectSessionInUrl) and turns it into a real session before
// this component finishes mounting, which is what authorizes the
// updateUser({ password }) call below — no separate token handling needed
// here. If that never happens (expired/tampered link), there's no
// session and we bounce back to /forgot-password.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(true);
        setCheckingSession(false);
      }
    });

    // In case the PASSWORD_RECOVERY event already fired before this
    // listener was attached, also check directly.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true);
      setCheckingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setSubmitting(false);
      setError(updateError.message || 'Could not reset your password. Please try again.');
      return;
    }

    // Sign out of the recovery session so the user has to log back in
    // with their new password, rather than silently continuing on into
    // the app under the token from the email link.
    await supabase.auth.signOut();
    setSubmitting(false);
    setDone(true);
  }

  if (checkingSession) return null;

  return (
    <div className="flex min-h-screen">
      <BrandPanel />

      <section className="flex flex-1 items-center justify-center bg-white px-5 py-8 sm:px-8 sm:py-10">
        <div className="w-full max-w-90">
          <div className="mb-2 flex flex-col items-center gap-2.5">
            <Image src="/assets/oshodi-logo.png" alt="Oshodi Market Online logo" width={220} height={56} className="h-auto w-45 object-contain sm:w-55" />
          </div>

          <div className="mb-7 text-center">
            <h2 className="text-[1.25rem] font-extrabold text-[#1d2734]">Set a new password</h2>
            <p className="mt-1 text-[0.82rem] text-[#6b7280]">Choose a new password for your account.</p>
          </div>

          {!hasSession ? (
            <div className="rounded-lg border border-[#f3b9b9] bg-[#fdecec] px-3.5 py-3 text-center text-[0.82rem] font-semibold text-[#9c2b2b]">
              This reset link is invalid or has expired.{' '}
              <button type="button" onClick={() => router.push('/forgot-password')} className="underline">
                Request a new one
              </button>
              .
            </div>
          ) : done ? (
            <div className="rounded-lg border border-[#c9e6d3] bg-[#eafaf0] px-3.5 py-3 text-center text-[0.82rem] font-semibold text-[#1f7a45]">
              Your password has been reset.{' '}
              <button type="button" onClick={() => router.push('/login')} className="underline">
                Continue to login
              </button>
              .
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-3.5 rounded-lg border border-[#f3b9b9] bg-[#fdecec] px-3 py-2.5 text-[0.78rem] font-semibold text-[#9c2b2b]">
                  {error}
                </div>
              )}

              <div className="relative mb-3.5">
                <span className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2">
                  <Image src="/assets/lock.png" alt="" width={18} height={18} className="h-full w-full object-contain opacity-55" />
                </span>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-[10px] border border-[#dcdde0] bg-[#fbfbfc] py-3.5 pl-10.5 pr-4 text-[0.88rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
                />
              </div>

              <div className="relative mb-4.5">
                <span className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2">
                  <Image src="/assets/lock.png" alt="" width={18} height={18} className="h-full w-full object-contain opacity-55" />
                </span>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-[10px] border border-[#dcdde0] bg-[#fbfbfc] py-3.5 pl-10.5 pr-4 text-[0.88rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-[10px] bg-linear-to-b from-[#4B2E83] to-[#392065] py-3.5 text-[0.9rem] font-extrabold tracking-wide text-white hover:from-[#5a3799] hover:to-[#2d1850] disabled:opacity-60"
              >
                {submitting ? 'Please wait…' : 'Reset password'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

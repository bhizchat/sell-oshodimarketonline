'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import BrandPanel from '@/components/brand-panel';

// Requests a password reset email. Always shows the same generic
// confirmation regardless of whether the email is registered — the
// /api/auth/forgot-password endpoint itself never reveals that either,
// so this page can't be used to enumerate accounts.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error || 'Something went wrong. Please try again.');
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen">
      <BrandPanel />

      <section className="flex flex-1 items-center justify-center bg-white px-5 py-8 sm:px-8 sm:py-10">
        <div className="w-full max-w-90">
          <div className="mb-2 flex flex-col items-center gap-2.5">
            <Image src="/assets/oshodi-logo.png" alt="Oshodi Market Online logo" width={220} height={56} className="h-auto w-45 object-contain sm:w-55" />
          </div>

          <div className="mb-7 text-center">
            <h2 className="text-[1.25rem] font-extrabold text-[#1d2734]">Reset your password</h2>
            <p className="mt-1 text-[0.82rem] text-[#6b7280]">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {sent ? (
            <div className="rounded-lg border border-[#c9e6d3] bg-[#eafaf0] px-3.5 py-3 text-center text-[0.82rem] font-semibold text-[#1f7a45]">
              If an account exists for that email, a password reset link has been sent. Check your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-3.5 rounded-lg border border-[#f3b9b9] bg-[#fdecec] px-3 py-2.5 text-[0.78rem] font-semibold text-[#9c2b2b]">
                  {error}
                </div>
              )}

              <div className="relative mb-4.5">
                <span className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2">
                  <Image src="/assets/email.png" alt="" width={18} height={18} className="h-full w-full object-contain opacity-55" />
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[10px] border border-[#dcdde0] bg-[#fbfbfc] py-3.5 pl-10.5 pr-4 text-[0.88rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-[10px] bg-linear-to-b from-[#4B2E83] to-[#392065] py-3.5 text-[0.9rem] font-extrabold tracking-wide text-white hover:from-[#5a3799] hover:to-[#2d1850] disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          <p className="mt-5.5 text-center text-[0.82rem] text-[#6b7280]">
            <Link href="/login" className="font-extrabold text-[#4B2E83]">
              Back to sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

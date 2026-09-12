'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

// The screen shown after someone picks "Join as Staff/Manager" on
// onboarding step 1, ported 1:1 from the static site's staff-join.html.
// Wired to real portal creation: the invite code is redeemed via the
// sx_join_shop_by_code() SECURITY DEFINER RPC (the only way a row can
// ever land in sx_shop_members), which validates the code, creates the
// membership row (role starts NULL/"Pending" until the owner assigns one
// from My Shop > Team Members), then we persist onboarding metadata and
// drop the user straight into the shared dashboard.
export default function StaffJoinPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      const meta = session.user.user_metadata || {};
      if (meta.sx_full_name) setFullName(meta.sx_full_name);

      // Already joined a shop on a previous visit? Skip straight to the
      // dashboard instead of asking them to enter a code again.
      const { data: membership } = await supabase
        .from('sx_shop_members')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (membership) {
        router.replace('/dashboard');
        return;
      }

      setCheckingSession(false);
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedCode = inviteCode.trim();

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc('sx_join_shop_by_code', {
        p_invite_code: trimmedCode,
        p_full_name: trimmedName,
      });

      if (rpcError) {
        setError(rpcError.message || 'Unable to join this shop. Please check your invitation code.');
        setSubmitting(false);
        return;
      }

      await supabase.auth.updateUser({
        data: { sx_onboarded: true, sx_shop_role: 'staff', sx_full_name: trimmedName },
      });

      // Go straight into the shared dashboard, already signed in — no
      // extra "back to sign in" detour. Role assignment happens later,
      // from inside the dashboard's pending-role status badge.
      window.location.href = '/dashboard';
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (checkingSession) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] px-5 py-8">
      <div className="w-full max-w-[420px] rounded-[18px] bg-white p-8.5 py-8.5 text-center shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
        <Image
          src="/assets/oshodi-logo.png"
          alt="Oshodi Market Online logo"
          width={120}
          height={32}
          className="mx-auto mb-5.5 h-auto w-[120px] object-contain"
        />
        <div className="mb-1.5 text-[1.25rem] font-extrabold">Join as Staff or Manager</div>
        <p className="mb-6.5 text-[0.85rem] text-[#6b7280]">
          Enter the invitation code you received from a shop owner.
        </p>

        {error && (
          <p className="mb-4 rounded-[10px] border border-[#f3c2bd] bg-[#fdecea] px-3 py-2.5 text-left text-[0.8rem] font-semibold text-[#b3261e]">
            {error}
          </p>
        )}

        <form className="text-left" onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="fullNameInput" className="mb-1.5 block text-[0.78rem] font-bold">
              Your Full Name
            </label>
            <input
              id="fullNameInput"
              type="text"
              required
              placeholder="e.g. Tunde Adewale"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-[10px] border border-[#dcdde0] px-3.5 py-3 text-[0.9rem] text-[#1d2734] outline-none focus:border-[#6c5ce7]"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="inviteCodeInput" className="mb-1.5 block text-[0.78rem] font-bold">
              Invitation Code
            </label>
            <input
              id="inviteCodeInput"
              type="text"
              required
              placeholder="SX-XXXXXX"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full rounded-[10px] border border-[#dcdde0] px-3.5 py-3 font-mono text-[0.9rem] uppercase tracking-[0.06em] text-[#1d2734] outline-none focus:border-[#6c5ce7]"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-1.5 w-full rounded-[10px] bg-[linear-gradient(180deg,#4B2E83,#392065)] py-3.5 text-[0.9rem] font-extrabold tracking-[0.01em] text-white disabled:opacity-45"
          >
            {submitting ? 'Joining...' : 'Join Shop'}
          </button>
        </form>
      </div>
    </div>
  );
}

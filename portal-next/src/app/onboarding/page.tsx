'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

type Role = 'owner' | 'staff';

// Onboarding step 1 of 3, ported 1:1 from the static site's onboarding.html.
// Shown right after a new user confirms their account — lets them pick
// whether they're opening their own digital shop or joining an existing
// one as staff/manager. Guard: no session -> /login. Deliberately does
// NOT auto-forward a returning-but-unfinished staff pick straight to
// /staff-join (an earlier version did) — anyone who abandons onboarding
// partway through and signs back in later always lands on this role
// picker first, so the flow restarts from the beginning instead of
// resuming exactly where they left off.
export default function OnboardingPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
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

      setCheckingSession(false);
    })();
  }, [router]);

  async function handleContinue() {
    if (!selectedRole) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({ data: { sx_shop_role: selectedRole } });
      if (selectedRole === 'owner') {
        router.push('/onboarding/step2');
        return;
      }
      router.push('/staff-join');
    } catch {
      setSubmitting(false);
    }
  }

  if (checkingSession) return null;

  return (
    <div className="flex min-h-screen bg-[#392065] max-[900px]:flex-col">
      {/* Left: brand / marketing panel */}
      <section className="relative flex flex-[1.05] flex-col overflow-hidden bg-[linear-gradient(160deg,#4B2E83_0%,#2d1850_100%)] p-12 text-white max-[900px]:min-h-65 max-[900px]:p-8 max-[480px]:p-6">
        <div className="flex flex-col gap-1">
          <Image src="/assets/oshodi-logo.png" alt="Oshodi Market Online logo" width={150} height={40} className="h-auto w-[150px] object-contain" />
          <div className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#6c5ce7]">
            Local Markets. Limitless Possibilities.
          </div>
        </div>

        <div className="mt-14 max-w-[420px] max-[900px]:mt-6">
          <h1 className="mb-3.5 text-[2.1rem] font-black leading-[1.15] tracking-tight text-white max-[900px]:text-[1.6rem]">
            Let&apos;s get your digital shop <span className="text-[#6c5ce7]">online.</span>
          </h1>
          <p className="mb-8.5 text-[0.9rem] text-[#d2c2f8]">
            Oshodi Market Online connects local markets to customers everywhere. Choose your market, set up your shop, and start growing.
          </p>

          <div className="flex flex-col gap-4.5">
            <Feature icon="/assets/shop.png" title="Own Your Digital Shop" desc="Create your official shop and showcase your products." />
            <Feature icon="/assets/group.png" title="Reach More Customers" desc="Get discovered by thousands of buyers." />
            <Feature icon="/assets/graph.png" title="Grow Your Business" desc="Tools and insights to help you sell more and grow bigger." />
          </div>
        </div>
      </section>

      {/* Right: onboarding card */}
      <section className="flex flex-1 items-center justify-center bg-[#f8f9fa] px-8 py-10 max-[900px]:px-5 max-[900px]:py-8">
        <div className="w-full max-w-[420px] rounded-[18px] bg-white p-8.5 shadow-[0_20px_50px_rgba(0,0,0,0.25)] max-[480px]:p-6">
          <div className="mb-4.5 flex items-center justify-center gap-2">
            <StepDot num={1} active />
            <div className="h-0.5 w-9 bg-[#dcdde0]" />
            <StepDot num={2} />
            <div className="h-0.5 w-9 bg-[#dcdde0]" />
            <StepDot num={3} />
          </div>
          <div className="mb-2 text-center text-[0.72rem] font-bold uppercase tracking-[0.04em] text-[#6b7280]">Step 1 of 3</div>
          <div className="mb-1 text-center text-[1.3rem] font-extrabold text-[#1d2734]">Welcome to Oshodi Market Online 👋</div>
          <p className="mb-6 text-center text-[0.85rem] text-[#6b7280]">Let&apos;s set up your account and get your digital shop live.</p>

          <div className="mb-2.5 text-[0.82rem] font-bold text-[#1d2734]">I want to...</div>

          <RoleOption
            icon="/assets/shop.png"
            title="Open a Digital Shop"
            desc="I want to sell my products and reach more customers."
            selected={selectedRole === 'owner'}
            onClick={() => setSelectedRole('owner')}
          />
          <RoleOption
            icon="/assets/user.png"
            title="Join as Staff / Manager"
            desc="I've been invited to manage or help a shop on Oshodi Market Online."
            selected={selectedRole === 'staff'}
            onClick={() => setSelectedRole('staff')}
          />

          <div className="my-4 flex items-start gap-2.5 rounded-xl border border-[#dcdde0] bg-[#f8f9fa] px-3.5 py-3">
            <div className="shrink-0">
              <Image src="/assets/lock.png" alt="" width={16} height={16} className="h-4 w-4 object-contain" />
            </div>
            <div className="text-[0.76rem] text-[#6b7280]">
              <strong className="text-[#1d2734]">Secure &amp; Trusted.</strong> Your information is safe with us. We verify all sellers to keep our community trusted and reliable.
            </div>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedRole || submitting}
            className="w-full rounded-[10px] bg-[linear-gradient(180deg,#4B2E83,#392065)] py-3.5 text-[0.9rem] font-extrabold tracking-[0.01em] text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? 'Please wait...' : 'Continue'}
          </button>
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-white/15 bg-gradient-to-br from-[#e5e6e8] to-[#6c5ce7]">
        <Image src={icon} alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
      </div>
      <div>
        <div className="mb-0.5 text-[0.9rem] font-bold text-white">{title}</div>
        <div className="text-[0.8rem] text-[#a9aaad]">{desc}</div>
      </div>
    </div>
  );
}

function StepDot({ num, active }: { num: number; active?: boolean }) {
  return (
    <div
      className={`flex h-6.5 w-6.5 items-center justify-center rounded-full text-[0.72rem] font-extrabold ${
        active ? 'bg-[#392065] text-white' : 'bg-[#e5e6e8] text-[#6b7280]'
      }`}
    >
      {num}
    </div>
  );
}

function RoleOption({
  icon,
  title,
  desc,
  selected,
  onClick,
}: {
  icon: string;
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`mb-3 flex cursor-pointer items-center gap-3.5 rounded-xl border p-3.5 transition-colors ${
        selected ? 'border-[#4B2E83] bg-[#f8f9fa]' : 'border-[#dcdde0] bg-white hover:border-[#6c5ce7]'
      }`}
    >
      <div className="flex h-10.5 w-10.5 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-[#e5e6e8] to-[#6c5ce7]">
        <Image src={icon} alt="" width={24} height={24} className="h-6 w-6 object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-[0.9rem] font-bold text-[#1d2734]">{title}</div>
        <div className="text-[0.78rem] text-[#6b7280]">{desc}</div>
      </div>
      <div className="shrink-0 text-[1.1rem] text-[#6b7280]">›</div>
    </div>
  );
}

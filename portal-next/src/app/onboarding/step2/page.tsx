'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { normalizeWhatsAppNumber } from '@/lib/phone';

const CATEGORIES = [
  { value: 'fashion', label: 'Clothing & Fashion' },
  { value: 'electronics', label: 'Electronics & Gadgets' },
  { value: 'fabrics', label: 'Fabrics & Textiles' },
  { value: 'foodstuff', label: 'Foodstuffs & Oils' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'other', label: 'Other' },
];

const MARKET_PLATFORMS = [{ value: 'oshodi-market-online', label: 'Oshodi Market Online' }];

// Onboarding step 2 of 3, ported 1:1 from the static site's
// onboarding-step2.html. Collects the business/shop details and stashes
// them on the user's auth metadata (sx_full_name, sx_phone, etc.) via
// updateUser(), same pattern as step 1 — the actual sx_shops row only
// gets created once step 3 (logo/banner upload + "Complete Setup") runs.
export default function OnboardingStep2Page() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bizEmail, setBizEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState('');
  const [marketPlatform, setMarketPlatform] = useState('oshodi-market-online');
  const [description, setDescription] = useState('');

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

      setCheckingSession(false);
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const requiredFields: Array<[string, string]> = [
      [fullName, 'Full Name'],
      [phoneNumber, 'Phone Number'],
      [bizEmail, 'Email Address'],
      [whatsapp, 'WhatsApp Number'],
      [shopName, 'Proposed Shop Name'],
      [category, 'Category'],
      [marketPlatform, 'Market Platform'],
    ];
    const missingLabels = requiredFields.filter(([value]) => !value.trim()).map(([, label]) => label);
    if (missingLabels.length) {
      setError(`Please fill in the following field(s): ${missingLabels.join(', ')}.`);
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          sx_full_name: fullName.trim(),
          sx_phone: phoneNumber.trim(),
          sx_business_email: bizEmail.trim(),
          sx_whatsapp: normalizeWhatsAppNumber(whatsapp),
          sx_shop_name: shopName.trim(),
          sx_category: category,
          sx_market_platform: marketPlatform,
          sx_description: description.trim(),
        },
      });
      if (updateError) {
        setError('Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }
      router.push('/onboarding/step3');
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (checkingSession) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#392065] px-4 py-8">
      <div className="flex w-full max-w-245 overflow-hidden rounded-[22px] border border-white/8 bg-[linear-gradient(160deg,#4B2E83_0%,#2d1850_100%)] text-white shadow-[0_24px_60px_rgba(0,0,0,0.5)] max-md:flex-col">
        {/* Left: brand / info column */}
        <section className="flex flex-none basis-75 flex-col border-r border-white/8 p-8 max-md:basis-auto max-md:border-r-0 max-md:border-b max-md:p-6">
          <div className="mb-7 flex flex-col gap-1">
            <Image src="/assets/oshodi-logo.png" alt="Oshodi Market Online logo" width={130} height={34} className="h-auto w-32.5 object-contain" />
            <div className="mt-px text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#6c5ce7]">
              Local Markets. Limitless Possibilities.
            </div>
          </div>

          <div className="mb-4 flex h-10.5 w-10.5 items-center justify-center rounded-[10px] border border-white/14 bg-linear-to-br from-[#e5e6e8] to-[#6c5ce7]">
            <Image src="/assets/shop.png" alt="" width={24} height={24} className="h-6 w-6 object-contain" />
          </div>
          <h2 className="mb-3 text-[1.4rem] font-black leading-[1.15] tracking-tight">
            Let&apos;s set up your <span className="text-[#6c5ce7]">shop</span>
          </h2>
          <p className="mb-auto text-[0.85rem] text-[#d2c2f8]">
            Tell us about you and your business so we can help you get started.
          </p>

          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/6 px-3.5 py-3">
            <div className="shrink-0">
              <Image src="/assets/lock.png" alt="" width={16} height={16} className="h-4 w-4 object-contain" />
            </div>
            <div className="text-[0.74rem] text-[#d2c2f8]">
              <strong className="text-white">Your Information is Safe.</strong> We take your privacy seriously and your information is protected with top security.
            </div>
          </div>
        </section>

        {/* Right: business details form */}
        <section className="min-w-0 flex-1 overflow-y-auto bg-white p-8 py-8 text-[#1d2734] max-md:px-6 max-md:py-6 max-[480px]:px-4">
          <div className="mb-3.5 flex items-center justify-center gap-2">
            <StepDot num="✓" done />
            <div className="h-0.5 w-10 bg-[#dcdde0]" />
            <StepDot num={2} active />
            <div className="h-0.5 w-10 bg-[#dcdde0]" />
            <StepDot num={3} />
          </div>
          <div className="mb-1.5 text-center text-[0.7rem] font-bold uppercase tracking-[0.06em] text-[#6b7280]">Step 2 of 3</div>
          <div className="mb-1 text-center text-[1.15rem] font-extrabold text-[#1d2734]">Tell us about your business</div>
          <p className="mb-6 text-center text-[0.82rem] text-[#6b7280]">This information helps customers find and trust your shop.</p>

          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="mb-3.5 rounded-lg border border-[#f3b9b9] bg-[#fdecec] px-3 py-2.5 text-[0.78rem] font-semibold text-[#9c2b2b]">
                {error}
              </div>
            )}

            <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-3.5 max-md:grid-cols-1">
              <Field label="Full Name" htmlFor="fullName">
                <input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-[9px] border border-[#dcdde0] bg-[#fbfbfc] px-3.5 py-2.75 text-[0.85rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
                />
              </Field>
              <Field label="Phone Number" htmlFor="phoneNumber">
                <input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-[9px] border border-[#dcdde0] bg-[#fbfbfc] px-3.5 py-2.75 text-[0.85rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
                />
              </Field>
              <Field label="Email Address" htmlFor="bizEmail">
                <input
                  id="bizEmail"
                  type="email"
                  placeholder="Enter your email address"
                  value={bizEmail}
                  onChange={(e) => setBizEmail(e.target.value)}
                  className="w-full rounded-[9px] border border-[#dcdde0] bg-[#fbfbfc] px-3.5 py-2.75 text-[0.85rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
                />
              </Field>
              <Field label="WhatsApp Number" htmlFor="whatsapp">
                <input
                  id="whatsapp"
                  type="tel"
                  placeholder="Enter your WhatsApp number"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full rounded-[9px] border border-[#dcdde0] bg-[#fbfbfc] px-3.5 py-2.75 text-[0.85rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
                />
              </Field>
            </div>

            <div className="mb-3 mt-4.5 border-t border-[#dcdde0] pt-2.5 text-[0.82rem] font-extrabold text-[#1d2734]">
              Business Details
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 max-md:grid-cols-1">
              <Field label="Proposed Shop Name" htmlFor="shopName" full>
                <input
                  id="shopName"
                  type="text"
                  placeholder="Enter your shop name"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full rounded-[9px] border border-[#dcdde0] bg-[#fbfbfc] px-3.5 py-2.75 text-[0.85rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
                />
              </Field>
              <Field label="Category" htmlFor="category">
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-[9px] border border-[#dcdde0] bg-[#fbfbfc] px-3.5 py-2.75 text-[0.85rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Market Platform" htmlFor="marketPlatform">
                <select
                  id="marketPlatform"
                  value={marketPlatform}
                  onChange={(e) => setMarketPlatform(e.target.value)}
                  className="w-full rounded-[9px] border border-[#dcdde0] bg-[#fbfbfc] px-3.5 py-2.75 text-[0.85rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
                >
                  <option value="" disabled>
                    Select a market platform
                  </option>
                  {MARKET_PLATFORMS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Shop Description" htmlFor="description" full>
                <textarea
                  id="description"
                  maxLength={500}
                  placeholder="Tell us about your products / services"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-18.5 w-full resize-y rounded-[9px] border border-[#dcdde0] bg-[#fbfbfc] px-3.5 py-2.75 text-[0.85rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
                />
                <div className="text-right text-[0.68rem] text-[#6b7280]">{description.length} / 500</div>
              </Field>
            </div>

            <div className="mt-5.5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push('/onboarding')}
                className="flex items-center gap-1.5 rounded-[9px] border border-[#dcdde0] bg-transparent px-5 py-3 text-[0.85rem] font-bold text-[#1d2734] hover:bg-[#f8f9fa]"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="max-w-55 flex-1 rounded-[9px] bg-[linear-gradient(180deg,#4B2E83,#392065)] py-3 text-[0.88rem] font-extrabold tracking-[0.01em] text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting ? 'Please wait...' : 'Continue'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function StepDot({ num, active, done }: { num: number | string; active?: boolean; done?: boolean }) {
  return (
    <div
      className={`flex h-6.5 w-6.5 items-center justify-center rounded-full text-[0.72rem] font-extrabold ${
        active ? 'bg-[#392065] text-white' : done ? 'bg-[#6c5ce7] text-white' : 'bg-[#e5e6e8] text-[#6b7280]'
      }`}
    >
      {num}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  full,
  children,
}: {
  label: string;
  htmlFor: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? 'col-span-2 max-md:col-span-1' : ''}`}>
      <label htmlFor={htmlFor} className="text-[0.76rem] font-bold text-[#1d2734]">
        {label}
      </label>
      {children}
    </div>
  );
}

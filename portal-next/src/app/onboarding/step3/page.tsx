'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { normalizeWhatsAppNumber } from '@/lib/phone';

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_BANNER_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ID_CARD_SIZE_BYTES = 5 * 1024 * 1024;
const SX_SHOP_ASSETS_BUCKET = 'sx-shop-assets';
const SX_VERIFICATION_DOCS_BUCKET = 'sx-verification-docs';

type UploadSlot = { file: File | null; error: string | null };

// Onboarding step 3 of 3 (final step), ported 1:1 from the static site's
// onboarding-step3.html. Uploads logo/banner (optional, public
// sx-shop-assets bucket) and National ID card (required, private
// sx-verification-docs bucket), stashes the shop-profile fields onto auth
// metadata, then creates/updates the sx_shops row for this owner and
// redirects to /payments-billing — the exact same sequence as the static
// site's "Complete Setup" handler.
export default function OnboardingStep3Page() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const [logo, setLogo] = useState<UploadSlot>({ file: null, error: null });
  const [banner, setBanner] = useState<UploadSlot>({ file: null, error: null });
  const [idCard, setIdCard] = useState<UploadSlot>({ file: null, error: null });

  const [shopAddress, setShopAddress] = useState('');
  const [shopTagline, setShopTagline] = useState('');

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

      userIdRef.current = session.user.id;
      setCheckingSession(false);
    })();
  }, [router]);

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    maxSizeBytes: number,
    setSlot: (slot: UploadSlot) => void
  ) {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setSlot({ file: null, error: null });
      return;
    }
    if (file.size > maxSizeBytes) {
      e.target.value = '';
      setSlot({ file: null, error: `File is too large (max ${Math.round(maxSizeBytes / (1024 * 1024))}MB).` });
      return;
    }
    setSlot({ file, error: null });
  }

  // Best-effort upload: logo/banner are optional, so any failure here is
  // swallowed (logged only) and never blocks completing the shop setup.
  async function uploadOptionalImage(file: File | null, folder: string): Promise<string | null> {
    if (!file || !userIdRef.current) return null;
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${userIdRef.current}/${folder}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from(SX_SHOP_ASSETS_BUCKET).upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(SX_SHOP_ASSETS_BUCKET).getPublicUrl(path);
      return data?.publicUrl || null;
    } catch (err) {
      console.warn(`Optional image upload failed (${folder}):`, err);
      return null;
    }
  }

  // Required upload: the ID card goes to a PRIVATE storage bucket (not
  // public like sx-shop-assets), so we store the storage path only, not a
  // public URL. Failure here throws and blocks setup completion.
  async function uploadRequiredIdCard(file: File): Promise<string> {
    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${userIdRef.current}/id-card/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from(SX_VERIFICATION_DOCS_BUCKET).upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    return path;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const missingLabels: string[] = [];
    if (!shopAddress.trim()) missingLabels.push('Shop Address / Location');
    if (!idCard.file) missingLabels.push('National ID Card');
    if (missingLabels.length) {
      setError(`Please fill in the following field(s): ${missingLabels.join(', ')}.`);
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      // Logo, banner, and ID card uploads don't depend on each other, so
      // run them in parallel instead of sequentially awaiting each one.
      const [logoUrl, bannerUrl, idCardPath] = await Promise.all([
        uploadOptionalImage(logo.file, 'logo'),
        uploadOptionalImage(banner.file, 'banner'),
        uploadRequiredIdCard(idCard.file!),
      ]);

      const trimmedAddress = shopAddress.trim();
      const trimmedTagline = shopTagline.trim();

      await supabase.auth.updateUser({
        data: {
          sx_shop_address: trimmedAddress,
          sx_shop_tagline: trimmedTagline,
          sx_shop_logo_url: logoUrl,
          sx_shop_banner_url: bannerUrl,
          sx_id_card_path: idCardPath,
          sx_onboarded: true,
        },
      });

      // Auto-create the shop record backing this owner's storefront
      // presence (visible under "Check All Shops" on whichever market
      // platform they selected in step 2).
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user;
      const meta = currentUser?.user_metadata || {};

      const shopRow = {
        owner_id: userIdRef.current,
        shop_name: meta.sx_shop_name || '',
        full_name: meta.sx_full_name || '',
        email: meta.sx_business_email || currentUser?.email || '',
        phone: meta.sx_phone || '',
        // Defensively re-normalize here too (not just at step2 capture):
        // accounts that went through onboarding before this fix existed
        // still have a raw local-format number sitting in user_metadata.
        whatsapp: meta.sx_whatsapp ? normalizeWhatsAppNumber(meta.sx_whatsapp as string) : '',
        category: meta.sx_category || '',
        market_platform: meta.sx_market_platform || '',
        location: trimmedAddress,
        tagline: trimmedTagline,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        id_card_path: idCardPath,
      };

      const { error: shopError } = await supabase.from('sx_shops').upsert(shopRow, { onConflict: 'owner_id' });
      if (shopError) throw shopError;

      router.push('/payments-billing');
    } catch (err) {
      console.error('Shop profile setup failed:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (checkingSession) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#e4d7fc] px-4 py-8">
      <div className="flex w-full max-w-245 overflow-hidden rounded-[22px] border border-[#d2c2f8] bg-gradient-to-b from-[#e4d7fc] to-[#d2c2f8] text-[#1d2734] shadow-[0_24px_60px_rgba(0,0,0,0.15)] max-md:flex-col">
        {/* Left: brand / info column */}
        <section className="flex flex-none basis-75 flex-col border-r border-[#c7b8f0] p-8 max-md:basis-auto max-md:border-r-0 max-md:border-b max-md:p-6">
          <div className="mb-7 flex flex-col gap-1">
            <Image src="/assets/oshodi-logo.png" alt="Oshodi Market Online logo" width={130} height={34} className="h-auto w-32.5 object-contain" />
            <div className="mt-px text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#4B2E83]">
              Local Markets. Limitless Possibilities.
            </div>
          </div>

          <div className="mb-4 flex h-10.5 w-10.5 items-center justify-center rounded-[10px] border border-[#d2c2f8] bg-gradient-to-br from-[#e4d7fc] to-[#c7b8f0]">
            <Image src="/assets/shop.png" alt="" width={24} height={24} className="h-6 w-6 object-contain" />
          </div>
          <h2 className="mb-3 text-[1.4rem] font-black leading-[1.15] tracking-tight text-[#1d2734]">
            Let&apos;s build your <span className="text-[#6c5ce7]">digital</span> shop
          </h2>
          <p className="mb-auto text-[0.85rem] text-[#4b4d57]">
            Add your shop details, logo and contact information so customers can recognize and reach you easily.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 rounded-xl border border-[#c7b8f0] bg-white/40 px-4 py-3.5">
            <div className="text-[0.78rem] font-extrabold text-[#1d2734]">Tips for a great shop</div>
            <ul className="flex flex-col gap-1.5">
              {[
                'Use a clear logo and banner',
                'Add accurate contact details',
                'Write a short and clear description',
                'This builds trust and attracts more customers',
              ].map((tip) => (
                <li key={tip} className="relative pl-5 text-[0.74rem] text-[#4b4d57]">
                  <span className="absolute left-0 top-0 font-bold text-[#6c5ce7]">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Right: shop profile form */}
        <section className="min-w-0 flex-1 overflow-y-auto bg-white p-8 py-6 text-[#1d2734] max-md:px-6">
          <div className="mb-2.5 flex items-center justify-center gap-2">
            <StepDot num="✓" done />
            <div className="h-0.5 w-10 bg-[#dcdde0]" />
            <StepDot num="✓" done />
            <div className="h-0.5 w-10 bg-[#dcdde0]" />
            <StepDot num={3} active />
          </div>
          <div className="mb-1 text-center text-[0.7rem] font-bold uppercase tracking-[0.06em] text-[#6b7280]">Step 3 of 3</div>
          <div className="mb-1 text-center text-[1.15rem] font-extrabold text-[#1d2734]">Set up your shop profile</div>
          <p className="mb-3.5 text-center text-[0.82rem] text-[#6b7280]">Almost done! Add the final details to complete your shop setup.</p>

          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="mb-3.5 rounded-lg border border-[#f3b9b9] bg-[#fdecec] px-3 py-2.5 text-[0.78rem] font-semibold text-[#9c2b2b]">
                {error}
              </div>
            )}

            <div className="mb-2 text-[0.82rem] font-extrabold text-[#1d2734]">Shop Visuals</div>
            <div className="mb-1 grid grid-cols-2 gap-3 max-md:grid-cols-1">
              <UploadBox
                title="Upload Logo"
                hint="PNG, JPG or WEBP (Max 2MB)"
                fileName={logo.file?.name}
                fileError={logo.error}
                onChange={(e) => handleFileChange(e, MAX_LOGO_SIZE_BYTES, setLogo)}
              />
              <UploadBox
                title="Upload Banner"
                hint="PNG, JPG or WEBP (Recommended 1200x400px)"
                fileName={banner.file?.name}
                fileError={banner.error}
                onChange={(e) => handleFileChange(e, MAX_BANNER_SIZE_BYTES, setBanner)}
              />
            </div>

            <div className="mb-2 mt-2.5 border-t border-[#dcdde0] pt-2 text-[0.82rem] font-extrabold text-[#1d2734]">
              Identity Verification
            </div>
            <UploadBox
              title="Upload National ID Card"
              hint="PNG, JPG or WEBP (Max 5MB) — kept private, used only for verification"
              fileName={idCard.file?.name}
              fileError={idCard.error}
              onChange={(e) => handleFileChange(e, MAX_ID_CARD_SIZE_BYTES, setIdCard)}
            />

            <div className="mb-1.5 mt-2.5 border-t border-[#dcdde0] pt-2 text-[0.82rem] font-extrabold text-[#1d2734]">
              Contact &amp; Location
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 max-md:grid-cols-1">
              <div className="col-span-2 flex flex-col gap-1.5 max-md:col-span-1">
                <label htmlFor="shopAddress" className="text-[0.76rem] font-bold text-[#1d2734]">
                  Shop Address / Location
                </label>
                <input
                  id="shopAddress"
                  type="text"
                  placeholder="Enter your shop address or stall location"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  className="w-full rounded-[9px] border border-[#dcdde0] bg-[#fbfbfc] px-3.5 py-2.75 text-[0.85rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
                />
                <div className="text-[0.68rem] text-[#6b7280]">Be as specific as possible so customers can find you easily.</div>
              </div>
              <div className="col-span-2 flex flex-col gap-1.5 max-md:col-span-1">
                <label htmlFor="shopTagline" className="text-[0.76rem] font-bold text-[#1d2734]">
                  Shop Tagline (Optional)
                </label>
                <input
                  id="shopTagline"
                  type="text"
                  maxLength={60}
                  placeholder="E.g. Quality products, great prices!"
                  value={shopTagline}
                  onChange={(e) => setShopTagline(e.target.value)}
                  className="w-full rounded-[9px] border border-[#dcdde0] bg-[#fbfbfc] px-3.5 py-2.75 text-[0.85rem] text-[#1d2734] outline-none transition-colors focus:border-[#6c5ce7] focus:bg-white"
                />
                <div className="text-[0.68rem] text-[#6b7280]">Short tagline that describes your shop (Max 60 characters)</div>
              </div>
            </div>

            <div className="mt-3.5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push('/onboarding/step2')}
                className="flex items-center gap-1.5 rounded-[9px] border border-[#dcdde0] bg-transparent px-5 py-3 text-[0.85rem] font-bold text-[#1d2734] hover:bg-[#f8f9fa]"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="max-w-55 flex-1 rounded-[9px] bg-[linear-gradient(180deg,#4B2E83,#392065)] py-3 text-[0.88rem] font-extrabold tracking-[0.01em] text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Please wait...' : 'Complete Setup'}
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

function UploadBox({
  title,
  hint,
  fileName,
  fileError,
  onChange,
}: {
  title: string;
  hint: string;
  fileName?: string;
  fileError?: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const hasFile = !!fileName;
  return (
    <label
      className={`block w-full cursor-pointer rounded-[10px] border-[1.5px] border-dashed px-3.5 py-2.5 text-center transition-colors ${
        hasFile ? 'border-[#6c5ce7] bg-white' : 'border-[#dcdde0] bg-[#fbfbfc] hover:border-[#6c5ce7] hover:bg-white'
      }`}
    >
      <div className="mb-0.5 text-[1.1rem] text-[#6b7280]">↑</div>
      <div className="mb-0.5 text-[0.8rem] font-bold text-[#1d2734]">{title}</div>
      <div className="text-[0.66rem] text-[#6b7280]">{hint}</div>
      {fileName && <div className="mt-2 break-all text-[0.7rem] font-bold text-[#1e6b38]">{fileName}</div>}
      {fileError && <div className="mt-2 text-[0.7rem] font-bold text-[#9c2b2b]">{fileError}</div>}
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onChange} className="hidden" />
    </label>
  );
}

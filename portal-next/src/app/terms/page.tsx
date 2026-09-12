import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Oshodi Market Online - Terms of Service',
};

// Ported 1:1 (layout/copy) from terms.html — simple dark header with back
// link, numbered sections, footer. Public static page, no auth required.
export default function TermsPage() {
  return (
    <div className="min-h-full bg-[#f8f9fa] text-[#1d2734]">
      <header className="flex items-center justify-between bg-[#392065] px-8 py-4.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg">
            <Image src="/assets/oshodi-logo.png" alt="Oshodi Market Online logo" width={36} height={36} className="h-full w-full object-contain" />
          </div>
          <div className="text-[1.05rem] font-extrabold text-white">
            Oshodi<span className="text-[#c7b8f0]"> Market Online</span>
          </div>
        </div>
        <Link href="/signup" className="flex items-center gap-1.5 text-[0.82rem] font-bold text-[#c7b8f0] hover:text-white">
          ← Back to Sign Up
        </Link>
      </header>

      <main className="mx-auto max-w-190 px-6 pt-14 pb-20">
        <h1 className="mb-2 text-[1.9rem] font-black tracking-[-0.01em]">Terms of Service</h1>
        <p className="mb-9 text-[0.82rem] text-[#6b7280]">Last updated: August 27, 2026</p>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">1. Acceptance of Terms</h2>
          <p className="text-[0.92rem] text-[#6b7280]">
            By creating an account or otherwise accessing Oshodi Market Online, you agree to be bound by these Terms of Service. If you do not
            agree to these terms, do not use the platform.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">2. Who Can Use Oshodi Market Online</h2>
          <p className="text-[0.92rem] text-[#6b7280]">
            Oshodi Market Online connects local vendors and shoppers. You must be at least 18 years old and able to form a binding contract to
            create an account, whether as a vendor or a shopper.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">3. Vendor Accounts</h2>
          <p className="text-[0.92rem] text-[#6b7280]">
            Vendors are responsible for the accuracy of their shop listings, product information, and pricing. Oshodi Market Online may review,
            suspend, or remove any listing or account that violates these terms or applicable law.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">4. Acceptable Use</h2>
          <ul className="ml-5 list-disc space-y-1.5 text-[0.92rem] text-[#6b7280]">
            <li>Do not list counterfeit, stolen, or illegal goods.</li>
            <li>Do not misrepresent your identity, products, or business.</li>
            <li>Do not attempt to interfere with the security or normal operation of the platform.</li>
          </ul>
        </section>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">5. Payments and Fees</h2>
          <p className="text-[0.92rem] text-[#6b7280]">
            Any applicable fees for using Oshodi Market Online will be disclosed to you before you incur them. Vendors are responsible for their
            own applicable taxes.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">6. Termination</h2>
          <p className="text-[0.92rem] text-[#6b7280]">
            We may suspend or terminate your access to Oshodi Market Online at any time if we believe you have violated these terms.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">7. Disclaimers</h2>
          <p className="text-[0.92rem] text-[#6b7280]">
            Oshodi Market Online is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uninterrupted or error-free
            service.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">8. Changes to These Terms</h2>
          <p className="text-[0.92rem] text-[#6b7280]">
            We may update these Terms of Service from time to time. Continued use of Oshodi Market Online after changes take effect constitutes
            acceptance of the revised terms.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">9. Contact</h2>
          <p className="text-[0.92rem] text-[#6b7280]">
            Questions about these terms can be directed to the Oshodi Market Online team through the contact options provided on the platform.
          </p>
        </section>
      </main>

      <footer className="px-6 py-6 text-center text-[0.78rem] text-[#6b7280]">© 2026 Oshodi Market Online. All rights reserved.</footer>
    </div>
  );
}

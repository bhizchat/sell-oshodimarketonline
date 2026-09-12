import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Oshodi Market Online - Privacy Policy',
};

// Ported 1:1 (layout/copy) from privacy.html — same shell as /terms.
export default function PrivacyPage() {
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
        <h1 className="mb-2 text-[1.9rem] font-black tracking-[-0.01em]">Privacy Policy</h1>
        <p className="mb-9 text-[0.82rem] text-[#6b7280]">Last updated: August 27, 2026</p>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">1. Information We Collect</h2>
          <p className="text-[0.92rem] text-[#6b7280]">
            When you create a Oshodi Market Online account, we collect information such as your full name, email address, and password.
            Vendors may provide additional information about their shop and products.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">2. How We Use Your Information</h2>
          <ul className="ml-5 list-disc space-y-1.5 text-[0.92rem] text-[#6b7280]">
            <li>To create and manage your account.</li>
            <li>To operate and improve the Oshodi Market Online platform.</li>
            <li>To communicate with you about your account or transactions.</li>
            <li>To keep the platform secure and prevent fraud or abuse.</li>
          </ul>
        </section>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">3. Authentication Providers</h2>
          <p className="text-[0.92rem] text-[#6b7280]">
            If you sign in with Google, we receive basic profile information (such as your name and email address) from Google to
            create or access your Oshodi Market Online account. We do not receive your Google password.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">4. Sharing of Information</h2>
          <p className="text-[0.92rem] text-[#6b7280]">
            We do not sell your personal information. We may share information with service providers who help us operate Oshodi Market Online
            (such as our hosting and authentication provider), or when required by law.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">5. Data Retention</h2>
          <p className="text-[0.92rem] text-[#6b7280]">
            We retain your account information for as long as your account is active or as needed to provide you the platform&apos;s
            services.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">6. Your Choices</h2>
          <p className="text-[0.92rem] text-[#6b7280]">
            You may update your account information at any time, or request deletion of your account by contacting the Oshodi Market Online
            team.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">7. Security</h2>
          <p className="text-[0.92rem] text-[#6b7280]">
            We use reasonable technical and organizational measures to protect your information, including secure authentication
            practices. No method of transmission or storage is completely secure.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">8. Changes to This Policy</h2>
          <p className="text-[0.92rem] text-[#6b7280]">
            We may update this Privacy Policy from time to time. Continued use of Oshodi Market Online after changes take effect constitutes
            acceptance of the revised policy.
          </p>
        </section>

        <section className="mb-7">
          <h2 className="mb-2.5 text-[1.05rem] font-extrabold text-[#1d2734]">9. Contact</h2>
          <p className="text-[0.92rem] text-[#6b7280]">
            Questions about this Privacy Policy can be directed to the Oshodi Market Online team through the contact options provided on the
            platform.
          </p>
        </section>
      </main>

      <footer className="px-6 py-6 text-center text-[0.78rem] text-[#6b7280]">© 2026 Oshodi Market Online. All rights reserved.</footer>
    </div>
  );
}

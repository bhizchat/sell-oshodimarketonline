import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleLayout from '@/components/articles/article-layout';

export const metadata: Metadata = {
  title: 'Going Digital: Why It Matters - Oshodi Market Online',
};

// Ported 1:1 (layout/copy) from article-going-digital.html.
export default function GoingDigitalArticlePage() {
  return (
    <ArticleLayout
      tag="Industry Insight"
      title="Going Digital: Why It Matters"
      meta="May 10, 2026 · 4 min read · Oshodi Market Online Team"
      heroSrc="/assets/article-going-digital.png"
      heroAlt="Vendor using a phone to manage an online shop"
    >
      <p>
        For decades, local markets have run on relationships built face-to-face — a regular customer, a familiar stall, a trusted
        vendor. That won&apos;t change. But the way new customers find you, and the way you manage your business day to day, is
        shifting fast. Going digital isn&apos;t about replacing what makes local markets special — it&apos;s about giving that same
        trust a much bigger reach.
      </p>

      <h2>Your customers are already online</h2>
      <p>
        Even shoppers who prefer buying in person usually research first: checking what&apos;s available, comparing prices, or asking
        around online before they visit. If your shop has no digital presence, you&apos;re invisible during that entire research phase
        — no matter how good your stall looks in person.
      </p>

      <h2>Digital tools remove the busywork</h2>
      <p>
        Tracking orders on paper, restocking from memory, and calculating totals by hand all take time away from actually serving
        customers. A simple digital dashboard for orders, inventory, and sales frees up hours every week — time that goes straight back
        into growing the business.
      </p>

      <h2>It builds trust before the first sale</h2>
      <p>
        A vendor with clear photos, honest reviews, and a professional-looking shop page earns trust faster than one a shopper has never
        heard of. Digital presence acts like a reference letter that works for you around the clock.
      </p>

      <h2>It&apos;s more accessible than ever</h2>
      <p>
        Going digital used to mean hiring developers or building a website from scratch. Platforms like Oshodi Market Online remove that barrier
        entirely — vendors can set up a shop, list products, and start selling online in minutes, with no technical experience required.
      </p>

      <ul>
        <li>
          <strong>Visibility compounds.</strong> Every product you list online keeps working for you, even while you sleep.
        </li>
        <li>
          <strong>Time saved is money earned.</strong> Automating the busywork means more hours for sales and service.
        </li>
        <li>
          <strong>Trust is earned before the visit.</strong> A strong online shop reassures customers before they ever walk in.
        </li>
      </ul>

      <div className="mt-10 rounded-[14px] border border-[#dcdde0] bg-[#f8f9fa] p-7 text-center">
        <p className="mb-4 text-[#6b7280]">Take the first step toward going digital — set up your Oshodi Market Online shop in minutes.</p>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-[#392065] px-6 py-3 text-[0.9rem] font-bold whitespace-nowrap text-white hover:bg-[#222225]"
        >
          Get Started
        </Link>
      </div>
    </ArticleLayout>
  );
}

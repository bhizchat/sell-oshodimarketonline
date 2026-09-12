import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleLayout from '@/components/articles/article-layout';

export const metadata: Metadata = {
  title: '5 Ways to Grow Your Market Business - Oshodi Market Online',
};

// Ported 1:1 (layout/copy) from article-grow-your-market-business.html.
export default function GrowYourMarketBusinessArticlePage() {
  return (
    <ArticleLayout
      tag="Vendor Guide"
      title="5 Ways to Grow Your Market Business"
      meta="May 20, 2026 · 5 min read · Oshodi Market Online Team"
      heroSrc="/assets/article-grow-market-business.png"
      heroAlt="Vendor arranging colorful market goods"
    >
      <p>
        Running a market stall or a small local shop takes hustle, but hustle alone doesn&apos;t always translate into steady growth.
        The vendors who consistently grow are the ones who treat their stall like a real business — with a plan for reaching customers,
        keeping them coming back, and making the most of every sale. Here are five practical ways to grow your market business, starting
        today.
      </p>

      <h2>1. Know your regulars — and reward them</h2>
      <p>
        Your most loyal customers are your biggest growth lever. Keep a simple list (even a notebook works) of who buys from you often
        and what they usually get. A small discount, a free sample, or just remembering their order by name goes a long way toward
        turning a one-time buyer into a regular.
      </p>

      <h2>2. Make your shop easy to find, online and offline</h2>
      <p>
        Word of mouth is powerful, but it only reaches so far. Listing your shop and products online — with clear photos, prices, and
        your location — means shoppers who&apos;ve never walked past your stall can still discover you. A digital storefront works for
        you 24/7, even when you&apos;re closed.
      </p>

      <h2>3. Bundle and upsell thoughtfully</h2>
      <p>
        Look at what customers already buy together and package it. A produce vendor might bundle a soup starter kit; a fabric seller
        might pair complementary prints. Bundling increases the average sale size without feeling like a hard sell.
      </p>

      <h2>4. Track what&apos;s actually selling</h2>
      <p>
        Many vendors restock based on gut feeling. Instead, track your top sellers and slow movers over a few weeks. Double down on what
        moves, and don&apos;t be afraid to retire what doesn&apos;t — shelf space and capital are limited resources.
      </p>

      <h2>5. Ask for reviews and referrals</h2>
      <p>
        Happy customers are usually willing to say so — you just have to ask. A quick request after a good sale (&quot;Would you mind
        leaving us a review?&quot;) builds the kind of trust that turns new shoppers into customers before they&apos;ve even met you.
      </p>

      <ul>
        <li>
          <strong>Consistency compounds.</strong> Small improvements applied every week outperform big pushes done once.
        </li>
        <li>
          <strong>Data beats guesswork.</strong> Even simple tracking reveals patterns you&apos;d otherwise miss.
        </li>
        <li>
          <strong>Trust travels faster online.</strong> A visible, well-kept digital shop reassures new customers before they arrive.
        </li>
      </ul>

      <div className="mt-10 rounded-[14px] border border-[#dcdde0] bg-[#f8f9fa] p-7 text-center">
        <p className="mb-4 text-[#6b7280]">
          Ready to put these strategies to work? Create your digital shop with Oshodi Market Online and start reaching more customers today.
        </p>
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

import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleLayout from '@/components/articles/article-layout';

export const metadata: Metadata = {
  title: 'Success Story: From Stall to Scale - Oshodi Market Online',
};

// Ported 1:1 (layout/copy) from article-success-story.html.
export default function SuccessStoryArticlePage() {
  return (
    <ArticleLayout
      tag="Success Story"
      title="From Stall to Scale"
      meta="Apr 28, 2026 · 6 min read · Oshodi Market Online Team"
      heroSrc="/assets/article-success-story.png"
      heroAlt="Smiling vendor who grew her business with Oshodi Market Online"
    >
      <p>
        Three years ago, a single market stall was the entire business. Today, it supplies a dozen local retailers and ships orders
        across the region. This is the story of how one local vendor used Oshodi Market Online to turn a small stall into a scaling business —
        and what other vendors can learn from it.
      </p>

      <h2>Starting small, staying local</h2>
      <p>
        Like most market vendors, the business began with foot traffic alone: a stall, a handful of regulars, and word of mouth.
        Growth was steady but slow — limited by how many people physically walked past on any given day.
      </p>

      <blockquote>
        &quot;I knew my products were good. What I didn&apos;t have was a way for people outside my immediate area to find me.&quot; —
        Vendor, Oshodi Market Online
      </blockquote>

      <h2>The turning point: going online</h2>
      <p>
        Setting up a digital shop on Oshodi Market Online took less than an hour. Product photos went up, prices were listed clearly, and for
        the first time, the business had a presence that worked even when the stall was closed. Within the first month, online orders
        began arriving from parts of the city the vendor had never physically reached.
      </p>

      <h2>Using data to sell smarter</h2>
      <p>
        The dashboard made it easy to see which products were actually driving sales. Instead of guessing what to restock, decisions
        were based on real order history — cutting waste and freeing up capital to invest in the products that were working.
      </p>

      <h2>Scaling beyond one stall</h2>
      <p>
        As online orders grew, so did demand from local retailers who wanted to stock the same products. What started as a single
        market stall now supplies multiple shops in the area, with online sales continuing to grow alongside it.
      </p>

      <ul>
        <li>
          <strong>Growth doesn&apos;t require starting over.</strong> The same products and reputation carried over — only the reach
          changed.
        </li>
        <li>
          <strong>Data-driven restocking reduces waste.</strong> Selling what customers actually want, not what you assume they want,
          protects margins.
        </li>
        <li>
          <strong>Online demand can create offline opportunities.</strong> Digital visibility led directly to new wholesale
          relationships.
        </li>
      </ul>

      <p>
        This is one story among hundreds of vendors building their businesses with Oshodi Market Online — proof that a local market stall and a
        scaling business aren&apos;t mutually exclusive.
      </p>

      <div className="mt-10 rounded-[14px] border border-[#dcdde0] bg-[#f8f9fa] p-7 text-center">
        <p className="mb-4 text-[#6b7280]">Want a story like this to be yours? Start your own Oshodi Market Online shop today.</p>
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

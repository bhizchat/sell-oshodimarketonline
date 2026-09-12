import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleLayout from '@/components/articles/article-layout';

export const metadata: Metadata = {
  title: 'Reading Your Dashboard: Turn Data Into Sales Decisions - Oshodi Market Online',
  description: "A simple guide to using your Oshodi Market Online dashboard stats to make smarter decisions for your shop.",
};

// Ported 1:1 (layout/copy) from article-dashboard-data.html.
export default function DashboardDataArticlePage() {
  return (
    <ArticleLayout
      tag="Guides"
      title="Reading Your Dashboard: Turn Data Into Sales Decisions"
      meta="Jun 2, 2026 · 5 min read · Oshodi Market Online Team"
      heroSrc="/assets/dashboard-landing.png"
      heroAlt="Oshodi Market Online vendor dashboard showing shop views, calls, WhatsApp messages and rating"
    >
      <p>
        Every time a customer views your shop, calls, or messages you on WhatsApp, your Oshodi Market Online dashboard quietly records it. Most
        vendors check these numbers out of curiosity — but the vendors who grow fastest treat them as a decision-making tool. Here&apos;s
        how to actually use what your dashboard is telling you.
      </p>

      <h2>Shop Views: are you being found?</h2>
      <p>
        A steady rise in Shop Views usually means your listing is being discovered more — through search, shares, or word of mouth. If
        views are flat or falling, it&apos;s a signal to refresh your product photos, update your shop description, or make sure your
        shop link is being shared wherever you promote your business.
      </p>

      <h2>Phone Calls &amp; WhatsApp Messages: measuring real interest</h2>
      <p>
        Views show interest, but calls and WhatsApp messages show intent. If you&apos;re getting plenty of views but few messages,
        customers may be unsure about pricing, availability, or how to order — consider making that information clearer on your product
        listings.
      </p>

      <blockquote>&quot;Views tell you people are looking. Messages tell you people are ready to buy.&quot; — Oshodi Market Online Team</blockquote>

      <h2>Products &amp; Active Listings: don&apos;t let your shelf go stale</h2>
      <p>
        Your Active Listings count is a quick health check. Shops that regularly add new products or refresh out-of-stock items tend to
        see more repeat visits, because returning customers always find something new. If this number hasn&apos;t moved in a while, it
        may be time to add a product.
      </p>

      <h2>Shop Rating: your most valuable number</h2>
      <p>
        Your Shop Rating, built from real customer reviews, is often the first thing a new customer checks before reaching out.
        Responding to reviews — especially less positive ones — shows future customers that you&apos;re engaged and easy to work with,
        which builds trust faster than the rating number alone.
      </p>

      <ul>
        <li>
          <strong>Check your dashboard weekly, not daily.</strong> Short-term swings matter less than the overall trend.
        </li>
        <li>
          <strong>Pair views with messages.</strong> A gap between the two usually points to a pricing or clarity issue, not a demand
          issue.
        </li>
        <li>
          <strong>Treat your rating as a conversation.</strong> Replying to reviews turns a passive number into an active trust signal.
        </li>
      </ul>

      <p>
        Your dashboard isn&apos;t just a report card — it&apos;s a map of what&apos;s working and what needs attention. A few minutes
        reviewing it each week can turn guesswork into a plan.
      </p>

      <div className="mt-10 rounded-[14px] border border-[#dcdde0] bg-[#f8f9fa] p-7 text-center">
        <p className="mb-4 text-[#6b7280]">Ready to start tracking your own shop&apos;s growth? Set up your Oshodi Market Online dashboard today.</p>
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

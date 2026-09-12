'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Review, ReviewProduct, ReviewStatsEntry } from '@/lib/shop';

function starString(rating: number) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function reviewerInitials(name: string) {
  const parts = (name || '').trim().split(/\s+/);
  const initials = parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
  return initials || '?';
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type Tab = 'all' | 'pending' | 'responded';

// Client Component: ported from reviews.html's tabs/stats/search/filter/
// reply-modal script logic. A first page of full review rows (plus
// products, and every review's rating/reply-status via statsEntries) is
// fetched server-side (page.tsx) and passed in as props; "Load More"
// fetches subsequent pages of full review rows directly from Supabase and
// appends them, while the reply modal writes directly to the shared
// "reviews" table, same as the static site. The stats bar/rating
// breakdown/Top Rated panel are computed from statsEntries (ALL reviews)
// so they stay accurate regardless of how many full review rows have been
// loaded into the table below.
export default function ReviewsClient({
  shopId,
  initialReviews,
  totalCount,
  pageSize,
  statsEntries,
  products,
  loadError,
}: {
  shopId: string | null;
  initialReviews: Review[];
  totalCount: number;
  pageSize: number;
  statsEntries: ReviewStatsEntry[];
  products: ReviewProduct[];
  loadError: string | null;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [loadedCount, setLoadedCount] = useState(initialReviews.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [saving, setSaving] = useState(false);

  const hasMore = loadedCount < totalCount;

  async function loadMore() {
    if (!shopId || loadingMore || !hasMore) return;
    setLoadingMore(true);

    const supabase = createClient();
    const productIds = products.map((p) => p.id);
    const { data } = await supabase
      .from('reviews')
      .select('id, shop_key, reviewer_name, rating, comment, shop_reply, shop_reply_at, created_at')
      .in('shop_key', productIds)
      .order('created_at', { ascending: false })
      .range(loadedCount, loadedCount + pageSize - 1);

    const nextPage = ((data as Record<string, unknown>[]) || []).map((r) => ({
      id: r.id as string,
      shopKey: (r.shop_key as string) || '',
      reviewerName: (r.reviewer_name as string) || '',
      rating: (r.rating as number) || 0,
      comment: (r.comment as string) || '',
      shopReply: (r.shop_reply as string) || '',
      shopReplyAt: (r.shop_reply_at as string) || null,
      createdAt: (r.created_at as string) || null,
    }));

    setReviews((prev) => [...prev, ...nextPage]);
    setLoadedCount((prev) => prev + nextPage.length);
    setLoadingMore(false);
  }

  const productById = useMemo(() => {
    const map = new Map<string, ReviewProduct>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const total = statsEntries.length;
  const avg = total ? statsEntries.reduce((sum, r) => sum + r.rating, 0) / total : 0;
  const fiveStar = statsEntries.filter((r) => r.rating === 5).length;
  const fiveStarPct = total ? Math.round((fiveStar / total) * 100) : 0;

  const breakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = statsEntries.filter((r) => r.rating === star).length;
    const pct = total ? Math.round((count / total) * 100) : 0;
    return { star, count, pct };
  });

  const topRated = useMemo(() => {
    const byProduct: Record<string, number[]> = {};
    statsEntries.forEach((r) => {
      if (!r.shopKey) return;
      (byProduct[r.shopKey] ||= []).push(r.rating);
    });
    return Object.keys(byProduct)
      .map((productId) => {
        const ratings = byProduct[productId];
        const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        return { productId, avg: avgRating, count: ratings.length };
      })
      .sort((a, b) => b.avg - a.avg || b.count - a.count)
      .slice(0, 3)
      .map((entry) => ({ ...entry, product: productById.get(entry.productId) }))
      .filter((entry) => entry.product);
  }, [statsEntries, productById]);

  const filtered = reviews.filter((review) => {
    if (productFilter && review.shopKey !== productFilter) return false;
    if (ratingFilter && String(review.rating) !== ratingFilter) return false;
    if (search) {
      const product = productById.get(review.shopKey);
      const haystack = (review.reviewerName + ' ' + review.comment + ' ' + (product?.productName || '')).toLowerCase();
      if (!haystack.includes(search.trim().toLowerCase())) return false;
    }
    const hasReply = !!review.shopReply.trim();
    if (tab === 'pending' && hasReply) return false;
    if (tab === 'responded' && !hasReply) return false;
    return true;
  });

  const replyingReview = replyingId ? reviews.find((r) => r.id === replyingId) : null;

  function openReplyModal(review: Review) {
    setReplyingId(review.id);
    setReplyText(review.shopReply || '');
    setReplyError('');
  }

  function closeReplyModal() {
    setReplyingId(null);
    setReplyText('');
    setReplyError('');
  }

  async function saveReply() {
    const text = replyText.trim();
    if (!text) {
      setReplyError('Please write a reply before posting.');
      return;
    }
    if (!replyingId) return;

    const targetId = replyingId;
    const nowIso = new Date().toISOString();
    const previousReviews = reviews;

    // Apply the reply locally and close the modal immediately instead of
    // waiting on the full network round-trip; roll back and reopen with
    // an error message if the write actually fails.
    setReviews((prev) => prev.map((r) => (r.id === targetId ? { ...r, shopReply: text, shopReplyAt: nowIso } : r)));
    closeReplyModal();
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from('reviews').update({ shop_reply: text, shop_reply_at: nowIso }).eq('id', targetId);
    setSaving(false);

    if (error) {
      setReviews(previousReviews);
      setReplyingId(targetId);
      setReplyText(text);
      setReplyError(error.message || 'Could not save your reply. Please try again.');
    }
  }

  return (
    <>
      <div className="mb-5 flex gap-5.5 border-b border-[#e2e3e6]">
        {(
          [
            ['all', 'All Reviews'],
            ['pending', 'Pending'],
            ['responded', 'Responded'],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`border-b-2 pb-3 text-[0.84rem] font-bold ${
              tab === value ? 'border-[#1e8b4a] text-[#1e8b4a]' : 'border-transparent text-[#6b7280]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2.5 sm:gap-4 lg:grid-cols-[1fr_1fr_1fr_1.3fr]">
        <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-4 max-md:p-3">
          <div className="text-[0.72rem] text-[#6b7280] max-md:text-[0.62rem]">Overall Rating</div>
          <div className="mt-1.5 text-[1.3rem] font-extrabold max-md:mt-1 max-md:text-[1rem]">
            {avg.toFixed(1)} <span className="ml-1 align-middle text-[0.8rem] text-[#f4b740] max-md:text-[0.68rem]">{starString(avg)}</span>
          </div>
          <div className="mt-1 text-[0.68rem] text-[#6b7280] max-md:text-[0.6rem]">
            Based on {total} review{total === 1 ? '' : 's'}
          </div>
        </div>
        <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-4 max-md:p-3">
          <div className="text-[0.72rem] text-[#6b7280] max-md:text-[0.62rem]">Total Reviews</div>
          <div className="mt-1.5 text-[1.3rem] font-extrabold max-md:mt-1 max-md:text-[1rem]">{total}</div>
          <div className="mt-1 text-[0.68rem] text-[#6b7280] max-md:text-[0.6rem]">Across all products</div>
        </div>
        <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-4 max-md:p-3">
          <div className="text-[0.72rem] text-[#6b7280] max-md:text-[0.62rem]">5 Star Reviews</div>
          <div className="mt-1.5 text-[1.3rem] font-extrabold max-md:mt-1 max-md:text-[1rem]">
            {fiveStar} {total > 0 && <span className="ml-1.5 text-[0.68rem] font-normal text-[#6b7280] max-md:text-[0.6rem]">({fiveStarPct}%)</span>}
          </div>
          <div className="mt-2 h-1.25 overflow-hidden rounded-full bg-[#e5e6e8]">
            <div className="h-full rounded-full bg-[#1e8b4a]" style={{ width: `${fiveStarPct}%` }} />
          </div>
        </div>
        <div className="col-span-3 rounded-[14px] border border-[#e2e3e6] bg-white p-4 lg:col-span-1">
          <div className="mb-2.5 text-[0.78rem] font-bold text-[#6b7280]">Rating Breakdown</div>
          {breakdown.map(({ star, count, pct }) => (
            <div key={star} className="mb-1.5 flex items-center gap-2 text-[0.72rem] text-[#6b7280]">
              <span className="w-8.5 shrink-0">{star} Star</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e5e6e8]">
                <div className="h-full rounded-full bg-[#f4b740]" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-10.5 shrink-0 text-right">
                {count} ({pct}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4.5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-55 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[0.82rem] text-[#6b7280]">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviews by product or customer..."
            className="w-full rounded-[10px] border border-[#e2e3e6] bg-white py-2.5 pl-9 pr-3.5 text-[0.82rem] text-[#1d2734] outline-none focus:border-[#6c5ce7]"
          />
        </div>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="cursor-pointer rounded-[10px] border border-[#e2e3e6] bg-white px-3.5 py-2.5 text-[0.8rem] font-semibold text-[#6b7280]"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.productName}
            </option>
          ))}
        </select>
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="cursor-pointer rounded-[10px] border border-[#e2e3e6] bg-white px-3.5 py-2.5 text-[0.8rem] font-semibold text-[#6b7280]"
        >
          <option value="">All Ratings</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} Stars
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[2.2fr_1fr]">
        <div className="overflow-hidden rounded-[14px] border border-[#e2e3e6] bg-white">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <div className="text-[1.4rem]">⭐</div>
              <h3 className="text-[1rem] font-bold">
                {loadError ? 'Could not load reviews' : total === 0 ? 'No reviews yet' : 'No matching reviews'}
              </h3>
              <p className="max-w-[320px] text-[0.82rem] text-[#6b7280]">
                {loadError
                  ? `Could not load reviews (${loadError}). If this persists, the "reviews" table may need an additional RLS read policy for signed-in vendors — see sx-reviews-read-policy.sql.`
                  : total === 0
                    ? 'Once customers review your products, their feedback will show up here.'
                    : 'Try adjusting your search or filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="max-md:hidden">
                  <tr>
                    {['Review', 'Product', 'Rating', 'Date', 'Actions'].map((h) => (
                      <th key={h} className="border-b border-[#e2e3e6] px-5 py-3.5 text-left text-[0.7rem] font-bold uppercase tracking-wide text-[#6b7280]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((review, i) => {
                    const product = productById.get(review.shopKey);
                    const hasReply = !!review.shopReply.trim();
                    const isLast = i === filtered.length - 1;
                    return (
                      <tr
                        key={review.id}
                        className={`max-md:block max-md:w-full max-md:px-4.5 max-md:py-4 ${!isLast ? 'max-md:border-b max-md:border-[#e2e3e6]' : ''}`}
                      >
                        <td className={`px-5 py-4 align-top text-[0.84rem] max-md:block max-md:w-full max-md:border-b-0 max-md:px-0 max-md:py-0 ${isLast ? '' : 'border-b border-[#e2e3e6]'}`}>
                          <div className="flex max-w-80 gap-2.5 max-md:max-w-none">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e2e3e6] bg-[#e5e6e8] text-[0.7rem] font-extrabold">
                              {reviewerInitials(review.reviewerName)}
                            </div>
                            <div>
                              <div className="text-[0.82rem] font-bold">{review.reviewerName || 'Anonymous'}</div>
                              <div className="mt-0.5 text-[0.78rem] text-[#6b7280]">{review.comment}</div>
                              {hasReply && (
                                <div className="mt-2 rounded-lg border border-[#e2e3e6] bg-[#f8f9fa] px-2.5 py-2 text-[0.76rem] text-[#6b7280]">
                                  <strong className="text-[0.74rem] text-[#1d2734]">Your reply:</strong> {review.shopReply}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={`px-5 py-4 align-top text-[0.84rem] max-md:mt-3 max-md:block max-md:w-full max-md:border-b-0 max-md:px-0 max-md:py-0 ${isLast ? '' : 'border-b border-[#e2e3e6]'}`}>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e2e3e6] bg-[#e5e6e8] text-[0.8rem]">
                              {product?.thumbUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={product.thumbUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                '🛍'
                              )}
                            </div>
                            <span className="text-[0.8rem] font-semibold">{product?.productName || 'Unknown product'}</span>
                          </div>
                        </td>
                        <td className={`px-5 py-4 align-top text-[0.84rem] whitespace-nowrap max-md:mt-2.5 max-md:inline-block max-md:w-auto max-md:border-b-0 max-md:px-0 max-md:py-0 max-md:align-middle ${isLast ? '' : 'border-b border-[#e2e3e6]'}`}>
                          <span className="text-[0.78rem] text-[#f4b740]">
                            {starString(review.rating)} {review.rating}
                          </span>
                        </td>
                        <td className={`px-5 py-4 align-top text-[0.78rem] whitespace-nowrap text-[#6b7280] max-md:ml-2.5 max-md:mt-2.5 max-md:inline-block max-md:w-auto max-md:border-b-0 max-md:px-0 max-md:py-0 max-md:align-middle ${isLast ? '' : 'border-b border-[#e2e3e6]'}`}>
                          {formatDate(review.createdAt)}
                        </td>
                        <td className={`px-5 py-4 align-top text-[0.84rem] max-md:mt-3.5 max-md:block max-md:w-full max-md:border-b-0 max-md:px-0 max-md:py-0 ${isLast ? '' : 'border-b border-[#e2e3e6]'}`}>
                          <button
                            type="button"
                            onClick={() => openReplyModal(review)}
                            className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-[0.76rem] font-bold max-md:w-full ${
                              hasReply ? 'border-[#6c5ce7] text-[#1d2734]' : 'border-[#e2e3e6] text-[#6b7280] hover:border-[#6c5ce7] hover:bg-[#e5e6e8] hover:text-[#1d2734]'
                            }`}
                          >
                            {hasReply ? 'Edit Reply' : 'Reply'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center border-t border-[#e2e3e6] p-4">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-[10px] border border-[#e2e3e6] bg-white px-5 py-2.5 text-[0.82rem] font-extrabold text-[#1d2734] hover:bg-[#e5e6e8] disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : `Load More (${loadedCount} of ${totalCount})`}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-4.5">
          <div className="mb-3.5 text-[0.86rem] font-bold">Top Rated Products</div>
          {topRated.length === 0 ? (
            <p className="text-[0.78rem] text-[#6b7280]">No rated products yet.</p>
          ) : (
            topRated.map((entry) => (
              <div key={entry.productId} className="mb-3.5 flex items-center gap-2.5 last:mb-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e2e3e6] bg-[#e5e6e8] text-[0.9rem]">
                  {entry.product?.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.product.thumbUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    '🛍'
                  )}
                </div>
                <div>
                  <div className="text-[0.8rem] font-bold">{entry.product?.productName}</div>
                  <div className="mt-0.5 text-[0.72rem] text-[#6b7280]">
                    {entry.avg.toFixed(1)} ★ ({entry.count} review{entry.count === 1 ? '' : 's'})
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {replyingReview && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/55 p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeReplyModal();
          }}
        >
          <div className="max-h-[88vh] w-full max-w-[480px] overflow-y-auto rounded-2xl border border-[#e2e3e6] bg-white p-6">
            <div className="mb-1.5 text-[1rem] font-bold">Reply to Review</div>
            <div className="mb-4 border-b border-[#e2e3e6] pb-3.5 text-[0.8rem] text-[#6b7280]">
              <strong className="text-[#1d2734]">{replyingReview.reviewerName || 'Anonymous'}:</strong> {replyingReview.comment}
            </div>
            {replyError && <div className="mb-3 text-[0.78rem] text-[#e08a8a]">{replyError}</div>}
            <div className="mb-3.5">
              <label className="mb-1.5 block text-[0.78rem] font-semibold text-[#6b7280]">Your Reply</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={1000}
                placeholder="Thank you for your feedback..."
                className="min-h-25 w-full resize-y rounded-lg border border-[#e2e3e6] bg-[#f8f9fa] px-3 py-2.25 text-[0.86rem] text-[#1d2734] outline-none focus:border-[#6c5ce7]"
              />
            </div>
            <div className="mt-1.5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={closeReplyModal}
                className="rounded-[10px] border border-[#e2e3e6] bg-transparent px-4 py-2.5 text-[0.82rem] font-bold text-[#6b7280] hover:bg-[#e5e6e8] hover:text-[#1d2734]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveReply}
                disabled={saving}
                className="rounded-[10px] border-none bg-white px-4 py-2.5 text-[0.82rem] font-extrabold text-[#1d2734] shadow-[0_0_0_1px_#e2e3e6] hover:bg-[#e5e6e8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Posting...' : 'Post Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

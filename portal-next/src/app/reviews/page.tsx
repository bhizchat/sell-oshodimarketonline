import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveShopContext, loadShopReviews, loadShopReviewStats, REVIEWS_PAGE_SIZE, hasActiveAccess } from '@/lib/shop';
import Sidebar from '@/components/dashboard/sidebar';
import Topbar from '@/components/dashboard/topbar';
import ReviewsClient from '@/components/reviews/reviews-client';
import OnboardingTour from '@/components/dashboard/onboarding-tour';

// Server Component: ported 1:1 (layout/copy) from reviews.html — tabs,
// stats row + rating breakdown, search/filter bar, reviews table/empty
// state, and Top Rated Products panel. Reviews + products are fetched
// server-side, then handed to ReviewsClient for the interactive tabs/
// search/filter/reply-modal behavior the static page's script did.
export default async function ReviewsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const meta = (user.user_metadata as Record<string, unknown>) || {};
  const isOnboarded = !!meta.sx_onboarded;
  if (!isOnboarded) {
    redirect('/onboarding');
  }

  const ctx = await resolveShopContext(supabase, user);
  if (!ctx) {
    redirect('/staff-join');
  }

  const shop = ctx!;
  if (!hasActiveAccess(shop.subscriptionStatus, shop.accessUntil)) {
    redirect('/payments-billing');
  }
  const [reviewsData, statsEntries] = shop.shopId
    ? await Promise.all([loadShopReviews(supabase, shop.shopId), loadShopReviewStats(supabase, shop.shopId)])
    : [{ products: [], reviews: [], totalCount: 0, loadError: null }, []];

  const shopMeta = shop.category
    ? shop.category + (shop.marketPlatform !== 'Not set yet' ? ' · ' + shop.marketPlatform : '')
    : shop.marketPlatform;
  const shopInitial = shop.shopName.charAt(0).toUpperCase() || 'S';

  return (
    <div className="flex min-h-screen bg-[#392065]">
      <Sidebar
        shopName={shop.shopName}
        shopMeta={shopMeta}
        shopInitial={shopInitial}
        logoUrl={shop.logoUrl}
        isStaff={shop.isStaff}
        role={shop.role}
        reviewsCount={statsEntries.length}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-[#f8f9fa] text-[#1d2734]">
        <Topbar firstName={((meta.sx_full_name as string) || '').trim().split(' ')[0] || 'there'} profileInitial={shopInitial} />

        <div className="min-w-0 flex-1 px-8 pb-12 pt-7 max-md:px-4.5 max-md:pb-24 max-md:pt-5.5">
          <h1 className="text-[1.5rem] font-extrabold">Reviews</h1>
          <p className="mb-5.5 mt-1 text-[0.86rem] text-[#6b7280]">See what customers are saying about your products.</p>

          <ReviewsClient
            shopId={shop.shopId}
            initialReviews={reviewsData.reviews}
            totalCount={reviewsData.totalCount}
            pageSize={REVIEWS_PAGE_SIZE}
            statsEntries={statsEntries}
            products={reviewsData.products}
            loadError={reviewsData.loadError}
          />
        </div>

        {!shop.isStaff && <OnboardingTour autoShow={false} />}

        <div className="flex items-center justify-between border-t border-[#e2e3e6] px-8 py-4.5 text-[0.74rem] text-[#6b7280] max-md:mb-16 max-md:flex-col max-md:items-start max-md:gap-2 max-md:px-4.5">
          <div>© 2026 Oshodi Market Online. All rights reserved.</div>
          <div className="flex gap-4.5">
            <a href="/terms">Terms &amp; Conditions</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="#">Contact Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}

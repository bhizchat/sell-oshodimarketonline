import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveShopContext, loadShopStats, loadViewShopUrl } from '@/lib/shop';
import Sidebar from '@/components/dashboard/sidebar';
import Topbar from '@/components/dashboard/topbar';
import { StatCard } from '@/components/dashboard/stat-card';

// Server Component: everything below runs on the server BEFORE any HTML
// is sent to the browser. There is no client-side "fetch after mount"
// step and therefore no loading skeleton/pop-in — this is the "instant
// load" the static dashboard.html couldn't achieve with client-side
// Supabase calls.
export default async function DashboardPage() {
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

  const isStaff = meta.sx_shop_role === 'staff';
  const ctx = await resolveShopContext(supabase, user);
  if (isStaff && !ctx) {
    redirect('/staff-join');
  }

  const fullName = ((meta.sx_full_name as string) || '').trim();
  const firstName = fullName ? fullName.split(' ')[0] : 'there';

  const shop = ctx!;
  // loadShopStats and loadViewShopUrl don't depend on each other, so run
  // them in parallel rather than one after another.
  const [stats, viewShopUrl] = await Promise.all([
    shop.shopId ? loadShopStats(supabase, shop.shopId) : Promise.resolve(null),
    loadViewShopUrl(supabase, shop.shopId, shop.marketPlatform),
  ]);

  const shopMeta = shop.category
    ? shop.category + (shop.marketPlatform !== 'Not set yet' ? ' · ' + shop.marketPlatform : '')
    : shop.marketPlatform;

  return (
    <div className="flex min-h-screen bg-[#392065]">
      <Sidebar
        shopName={shop.shopName}
        shopMeta={shopMeta}
        shopInitial={shop.shopName.charAt(0).toUpperCase() || 'S'}
        logoUrl={shop.logoUrl}
        isStaff={isStaff}
        role={shop.role}
        reviewsCount={stats?.reviewCount ?? 0}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-[#f8f9fa] text-[#1d2734]">
        <Topbar firstName={firstName} profileInitial={firstName.charAt(0).toUpperCase() || 'U'} />

        <div className="min-w-0 flex-1 px-8 pb-12 pt-7 max-md:px-4.5 max-md:pb-24 max-md:pt-5.5">
          <h1 className="text-[1.5rem] font-extrabold">Welcome back, {firstName}! 👋</h1>
          <p className="mb-5.5 mt-1 text-[0.86rem] text-[#6b7280]">Here&apos;s what&apos;s happening with your shop today.</p>

          <div className="mb-5 flex items-center justify-between rounded-[14px] border border-[#e2e3e6] bg-white p-4.5 px-5.5">
            <div>
              <div className="text-[0.74rem] text-[#6b7280]">Shop ID</div>
              <div className="mt-0.5 text-[1.05rem] font-bold tracking-wide">{shop.shopCode || 'Not assigned yet'}</div>
            </div>
            {viewShopUrl && (
              <a
                href={viewShopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/[0.08] bg-[#f4b740] px-4 py-2 text-[#1d2734]"
              >
                View Shop
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <StatCard icon="/assets/visible.png" label="Shop Views" value={stats ? String(stats.shopViews) : '0'} delta="All time" />
            <StatCard icon="/assets/telephone.png" label="Phone Calls" value={stats ? String(stats.contactClicks) : '0'} delta="All time" />
            <StatCard
              icon="/assets/whatsapp.png"
              label="WhatsApp Messages"
              value={stats ? String(stats.whatsappClicks) : '0'}
              delta="All time"
            />
            <StatCard icon="/assets/parcel.png" label="Products" value={stats ? String(stats.productCount) : '0'} delta="Active Listings" />
            <div className="col-span-2 md:col-span-1">
              <StatCard
                icon="/assets/star.png"
                label="Shop Rating"
                value={stats && stats.avgRating !== null ? stats.avgRating.toFixed(1) : '0.0'}
                stars={renderStars(stats?.avgRating ?? 0)}
                delta={stats ? `(${stats.reviewCount} review${stats.reviewCount === 1 ? '' : 's'})` : '(0 reviews)'}
              />
            </div>
          </div>
        </div>

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

function renderStars(avgRating: number) {
  const fullStars = Math.round(avgRating);
  return '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
}

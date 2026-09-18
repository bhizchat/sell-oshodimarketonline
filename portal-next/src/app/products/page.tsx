import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveShopContext, loadProducts, loadProductStockStats, PRODUCTS_PAGE_SIZE, hasActiveAccess } from '@/lib/shop';
import Sidebar from '@/components/dashboard/sidebar';
import Topbar from '@/components/dashboard/topbar';
import ProductsClient from '@/components/products/products-client';
import OnboardingTour from '@/components/dashboard/onboarding-tour';

// Server Component: ported 1:1 (layout/copy) from products.html — stats
// row, search/filter bar, and the products table/empty-state. Products
// are fetched server-side, then handed to the client-side ProductsClient
// for the interactive search/filter behavior the static page's script did.
export default async function ProductsPage() {
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
  const [productsPage, stockStats] = shop.shopId
    ? await Promise.all([loadProducts(supabase, shop.shopId), loadProductStockStats(supabase, shop.shopId)])
    : [{ products: [], totalCount: 0 }, { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 }];

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
      />

      <div className="flex min-w-0 flex-1 flex-col bg-[#f8f9fa] text-[#1d2734]">
        <Topbar firstName={((meta.sx_full_name as string) || '').trim().split(' ')[0] || 'there'} profileInitial={shopInitial} />

        <div className="min-w-0 flex-1 px-8 pb-12 pt-7 max-md:px-4.5 max-md:pb-24 max-md:pt-5.5">
          <h1 className="text-[1.5rem] font-extrabold">My Products</h1>
          <p className="mb-5.5 mt-1 text-[0.86rem] text-[#6b7280]">Manage your products, stock and inventory.</p>

          <ProductsClient
            shopId={shop.shopId}
            initialProducts={productsPage.products}
            totalCount={productsPage.totalCount}
            stockStats={stockStats}
            pageSize={PRODUCTS_PAGE_SIZE}
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

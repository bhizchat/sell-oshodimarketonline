import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveShopContext, hasActiveAccess } from '@/lib/shop';
import Sidebar from '@/components/dashboard/sidebar';
import Topbar from '@/components/dashboard/topbar';
import AddProductClient from '@/components/add-product/add-product-client';

// Server Component: ported 1:1 (layout/copy) from add-product.html's
// breadcrumb + 4-card form. Auth/onboarding/staff guard mirrors every
// other dashboard-shell page; the shop's id is handed to the client form
// so it knows which shop_id to attach new sx_products rows to.
export default async function AddProductPage() {
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
  const isStaff = meta.sx_shop_role === 'staff';
  if (isStaff && !ctx) {
    redirect('/staff-join');
  }

  const shop = ctx!;
  if (!hasActiveAccess(shop.subscriptionStatus)) {
    redirect('/payments-billing');
  }
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
          <div className="mb-3.5 flex items-center gap-2 text-[0.78rem] text-[#6b7280]">
            <a href="/my-shop" className="hover:text-[#1d2734]">
              My Shop
            </a>
            <span>&rsaquo;</span>
            <a href="/products" className="hover:text-[#1d2734]">
              Products
            </a>
            <span>&rsaquo;</span>
            <span className="font-semibold text-[#1d2734]">Add New Product</span>
          </div>

          <h1 className="text-[1.5rem] font-extrabold">Add New Product</h1>
          <p className="mb-5.5 mt-1 text-[0.86rem] text-[#6b7280]">
            Add detailed information about your product to attract more customers.
          </p>

          <AddProductClient shopId={shop.shopId} />
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

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveShopContext, hasActiveAccess } from '@/lib/shop';
import Sidebar from '@/components/dashboard/sidebar';
import Topbar from '@/components/dashboard/topbar';
import PaymentsBillingClient from '@/components/payments-billing/payments-billing-client';

// Server Component: ported 1:1 (layout/copy) from payments-billing.html —
// breadcrumb, 3-step stepper (Choose Plan done / Payment Details active /
// Confirmation pending), plan-summary card + payment-details form. The
// static page has no real billing backend — trial dates are computed
// client-side and "Start Free Trial" is a simulated (non-persisted) submit,
// so that behavior is preserved as-is in PaymentsBillingClient.
export default async function PaymentsBillingPage() {
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
  if (hasActiveAccess(shop.subscriptionStatus, shop.accessUntil)) {
    redirect('/dashboard');
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
          <div className="mb-2.5 flex items-center gap-1.5 text-[0.8rem] text-[#6b7280]">
            <a href="/payments-billing" className="hover:underline">
              Payments &amp; Billing
            </a>
            <span className="mx-0.5">&rsaquo;</span>
            <span>Choose Plan</span>
            <span className="mx-0.5">&rsaquo;</span>
            <span className="font-bold text-[#1d2734]">Payment Details</span>
          </div>

          <h1 className="text-[1.5rem] font-extrabold">Get Full Access</h1>
          <p className="mb-5.5 mt-1 text-[0.86rem] text-[#6b7280]">
            Pay with card for a free trial that auto-renews, or pay with bank transfer for 30 days of access with no card required.
          </p>

          <PaymentsBillingClient isStaff={shop.isStaff} />
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

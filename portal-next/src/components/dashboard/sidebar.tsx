'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { closeMobileNav, toggleMobileNav, useMobileNavOpen } from './mobile-nav-store';

export type SidebarProps = {
  shopName: string;
  shopMeta: string;
  shopInitial: string;
  logoUrl: string;
  isStaff: boolean;
  role: string | null;
  reviewsCount?: number;
};

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '/assets/dashboard.png' },
  { href: '/my-shop', label: 'My Shop', icon: '/assets/shop.png' },
  { href: '/products', label: 'Products', icon: '/assets/parcel.png' },
  { href: '/reviews', label: 'Reviews', icon: '/assets/star.png', badge: true },
  { href: '/payments-billing', label: 'Payments & Billing', icon: '/assets/wallet.png' },
];

// Mobile bottom tab bar shows the 4 most-used destinations plus a "More"
// button that opens the same off-canvas drawer as the topbar hamburger —
// ported 1:1 from dashboard.html's <nav class="bottom-nav">.
const BOTTOM_NAV_ITEMS = NAV_ITEMS.slice(0, 4);

// Sidebar ported 1:1 from dashboard.html's <aside class="sidebar">: logo,
// shop card (avatar/name/meta/status pill), nav list with active-page
// highlighting, and the Support & Help popover. On mobile (<768px) this
// becomes an off-canvas drawer toggled by Topbar's hamburger button or
// the bottom tab bar's "More" item (shared open/close state lives in
// mobile-nav-store so the sibling components can all reach it), plus a
// fixed bottom tab bar for quick access to the main sections.
export default function Sidebar({ shopName, shopMeta, shopInitial, logoUrl, isStaff, role, reviewsCount = 0 }: SidebarProps) {
  const [supportOpen, setSupportOpen] = useState(false);
  const pathname = usePathname();
  const mobileOpen = useMobileNavOpen();

  // Close the drawer whenever the route changes (i.e. after tapping a nav
  // link) and on Escape, matching the static site's wireMobileSidebar().
  useEffect(() => {
    closeMobileNav();
  }, [pathname]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMobileNav();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  let statusText = '● Shop Open';
  let statusClass = 'text-[#9fe3b4] bg-[#9fe3b4]/10 border-[#9fe3b4]/30';
  if (isStaff) {
    if (role) {
      statusText = `● ${role.charAt(0).toUpperCase() + role.slice(1)}`;
    } else {
      statusText = '● Pending Role';
      statusClass = 'text-[#f4b740] bg-[#f4b740]/10 border-[#f4b740]/30';
    }
  }

  return (
    <>
      {mobileOpen && (
        <div
          onClick={closeMobileNav}
          className="fixed inset-0 z-490 bg-black/60 md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-500 flex w-[230px] shrink-0 flex-col bg-[linear-gradient(160deg,#e4d7fc_0%,#d2c2f8_100%)] px-4.5 py-6 text-[#1d2734] shadow-[0_0_40px_rgba(0,0,0,0.15)] transition-transform duration-250 ease-in-out max-md:overflow-y-auto md:static md:z-auto md:translate-x-0 md:overflow-visible md:shadow-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6.5 flex items-center">
          <Image src="/assets/oshodi-logo.png" alt="Oshodi Market Online logo" width={130} height={34} className="h-auto w-[130px] object-contain" />
        </div>

      <div className="mb-5.5 flex items-center gap-2.5 rounded-xl border border-[#c7b8f0] bg-white/70 px-3 py-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-[#e5e6e8]">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[0.9rem] font-extrabold text-[#1d2734]">{shopInitial}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[0.84rem] font-bold">{shopName}</div>
          <div className="truncate text-[0.68rem] text-[#6b7280]">{shopMeta || '\u00A0'}</div>
          <div className={`mt-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.66rem] font-bold ${statusClass}`}>
            {statusText}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5.5">
        <ul className="flex flex-col gap-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2.25 text-[0.82rem] font-semibold ${
                    isActive ? 'bg-[#392065] text-white' : 'text-[#4B2E83] hover:bg-white/60 hover:text-[#392065]'
                  }`}
                >
                  <span className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-[7px] bg-gradient-to-br from-[#e5e6e8] to-[#c7c9cc]">
                    <Image src={item.icon} alt="" width={15} height={15} className="h-[15px] w-[15px] object-contain" />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`rounded-full px-1.75 py-0.25 text-[0.62rem] font-extrabold ${
                        isActive ? 'bg-white text-[#392065]' : 'bg-[#6c5ce7] text-white'
                      }`}
                    >
                      {reviewsCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <ul>
          <li className="relative">
            <button
              type="button"
              onClick={() => setSupportOpen((v) => !v)}
              className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2.25 text-left text-[0.82rem] font-semibold text-[#4B2E83] hover:bg-white/60 hover:text-[#392065]"
            >
              <span className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-[7px] bg-gradient-to-br from-[#e5e6e8] to-[#c7c9cc]">
                <Image src="/assets/question.png" alt="" width={15} height={15} className="h-[15px] w-[15px] object-contain" />
              </span>
              <span className="flex-1">Support &amp; Help</span>
            </button>

            {supportOpen && (() => {
              const panelBody = (
                <>
                  <div className="relative pr-7">
                    <button
                      type="button"
                      onClick={() => setSupportOpen(false)}
                      aria-label="Close"
                      className="absolute -right-1.5 -top-1.5 flex h-6.5 w-6.5 items-center justify-center rounded-full bg-[#e5e6e8] text-[1.1rem] leading-none hover:bg-[#e2e3e6]"
                    >
                      &times;
                    </button>
                    <div className="text-[0.95rem] font-extrabold">Need more help?</div>
                    <div className="mt-0.5 text-[0.72rem] text-[#6b7280]">Our support team is here to assist you personally.</div>
                  </div>

                  <div className="flex gap-2.5">
                    <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-[#e5e6e8]">
                      <Image src="/assets/whatsapp.png" alt="" width={16} height={16} className="h-4 w-4 object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.82rem] font-bold">Chat with us</div>
                      <div className="mt-0.5 text-[0.72rem] text-[#6b7280]">Chat live with our support team in real-time.</div>
                      <a
                        href="https://wa.me/2349134333745"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block rounded-[7px] border border-[#f4b740] px-3 py-1.5 text-[0.74rem] font-bold text-[#f4b740] hover:bg-[#f4b740]/10"
                      >
                        Start Live Chat
                      </a>
                      <div className="mt-1.5 text-[0.66rem] text-[#6b7280]">Available Mon - Sat, 8AM - 6PM</div>
                    </div>
                  </div>

                  <div className="flex gap-2.5 border-t border-[#e2e3e6] pt-3.5">
                    <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-[#e5e6e8]">
                      <Image src="/assets/email.png" alt="" width={16} height={16} className="h-4 w-4 object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.82rem] font-bold">Email Support</div>
                      <div className="mt-0.5 text-[0.72rem] text-[#6b7280]">Send us an email and we&apos;ll get back to you.</div>
                      <a href="mailto:victoredochie10@gmail.com" className="mt-1.5 inline-block border-b border-[#f4b740]/40 text-[0.78rem] font-bold text-[#f4b740]">
                        victoredochie10@gmail.com
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-2.5 border-t border-[#e2e3e6] pt-3.5">
                    <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-[#e5e6e8]">
                      <Image src="/assets/telephone.png" alt="" width={16} height={16} className="h-4 w-4 object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.82rem] font-bold">Call Us</div>
                      <div className="mt-0.5 text-[0.72rem] text-[#6b7280]">Speak with our support team directly.</div>
                      <a href="tel:+2349134333745" className="mt-1.5 inline-block border-b border-[#f4b740]/40 text-[0.78rem] font-bold text-[#f4b740]">
                        +234 913 433 3745
                      </a>
                    </div>
                  </div>
                </>
              );

              // Always render as a centered, backdrop-dimmed modal via a
              // portal straight to <body>. This avoids the old sidebar-
              // anchored `position: absolute` popover, which could render at
              // a stray screen position (overlapping dashboard content)
              // whenever the sidebar was off-canvas/transformed or the
              // mobile/desktop viewport check hadn't settled yet.
              return createPortal(
                <>
                  <div
                    className="fixed inset-0 z-550 bg-black/60"
                    onClick={() => setSupportOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="fixed left-1/2 top-1/2 z-560 flex max-h-[calc(100vh-40px)] w-[min(340px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4.5 overflow-y-auto rounded-[14px] border border-[#e2e3e6] bg-white p-5 text-[#1d2734] shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                    {panelBody}
                  </div>
                </>,
                document.body
              );
            })()}
          </li>
        </ul>
      </div>

      <div className="mt-4 md:hidden">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2.25 text-left text-[0.82rem] font-semibold text-[#c0392b] hover:bg-[#e04b4b]/[0.14] hover:text-[#a52f22]"
        >
          ➤ Log Out
        </button>
      </div>
    </aside>

    <nav className="fixed inset-x-0 bottom-0 z-480 flex items-stretch justify-around border-t border-[#e2e3e6] bg-white px-1 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 md:hidden">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-0.75 px-0.5 py-1 text-[0.62rem] font-bold ${
                isActive ? 'text-[#1d2734]' : 'text-[#6b7280]'
              }`}
            >
              <span className={`flex h-8.5 w-8.5 items-center justify-center rounded-[10px] ${isActive ? 'bg-[#392065]' : ''}`}>
                <Image
                  src={item.icon}
                  alt=""
                  width={16}
                  height={16}
                  className={`h-4 w-4 object-contain ${isActive ? 'brightness-0 invert' : ''}`}
                />
                {item.badge && reviewsCount > 0 && (
                  <span className="absolute -top-0.5 right-2.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#6c5ce7] px-0.75 text-[0.55rem] font-extrabold text-white">
                    {reviewsCount}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={toggleMobileNav}
          className="relative flex flex-1 flex-col items-center gap-0.75 px-0.5 py-1 text-[0.62rem] font-bold text-[#6b7280]"
        >
          <span className="flex h-8.5 w-8.5 items-center justify-center rounded-[10px] text-base">☰</span>
          <span>More</span>
        </button>
      </nav>
    </>
  );
}

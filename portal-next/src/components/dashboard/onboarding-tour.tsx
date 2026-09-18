'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import {
  hideDashboardTour,
  setTourHasViewShopButton,
  setTourStepIndex,
  startDashboardTour,
  useTourState,
} from './dashboard-tour-store';
import { closeMobileNav, openMobileNav } from './mobile-nav-store';
import { setTourActiveTab } from './tour-active-tab-store';

export type OnboardingTourProps = {
  // Whether the tour should auto-show on mount (i.e. the shop owner has
  // never seen it before). Ignored while a manual replay is active.
  autoShow: boolean;
  // Whether the "View Shop" button exists on the dashboard right now —
  // if not (e.g. market platform not chosen yet), that step is skipped.
  // Only the Dashboard page passes this (it's the only one with the data
  // to know) — other pages omit it so they don't overwrite the real value
  // already recorded in the shared tour store with a guess.
  hasViewShopButton?: boolean;
};

type Step = {
  // Element id (without the leading '#') to point the bubble at. Mobile
  // steps that don't have a bottom-nav equivalent point at the "More"
  // button instead — see MOBILE_ID_OVERRIDES below.
  id: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    id: 'tour-stats',
    title: 'Your Dashboard',
    body: 'This is your Dashboard — a quick snapshot of how your shop is doing: views, calls, WhatsApp messages, and more.',
  },
  {
    id: 'tour-my-shop',
    title: 'My Shop',
    body: 'Head to My Shop to update your shop name, logo, and category anytime.',
  },
  {
    id: 'tour-products',
    title: 'Add Your Products',
    body: "This is where you add and manage your products. Tap here to upload photos, prices, and descriptions so customers can see what you sell.",
  },
  {
    id: 'tour-view-shop',
    title: 'Preview Your Shop',
    body: "Ready to see it live? Tap \u201cView Shop\u201d anytime to preview your shop exactly as customers see it.",
  },
  {
    id: 'tour-reviews',
    title: 'Customer Reviews',
    body: 'Customer reviews will show up here — you can read and reply to them to build trust.',
  },
  {
    id: 'tour-payments-billing',
    title: 'Payments & Billing',
    body: 'Manage your subscription, check your renewal date, or cancel anytime from here.',
  },
  {
    id: 'tour-support',
    title: 'Need Help?',
    body: 'Stuck on anything? Tap here anytime to chat with us on WhatsApp or send an email.',
  },
];

// On mobile, My Shop/Products/Reviews live in the fixed bottom tab bar
// under separate `-mobile`-suffixed ids (the desktop sidebar's copies of
// these links exist in the DOM too, but sit off-screen via
// `-translate-x-full` until the drawer is opened, so they must never be
// used as measurement targets on mobile). Dashboard also points at its
// own bottom-tab icon on mobile rather than spotlighting the stats grid,
// which doesn't fit well inside a small mobile viewport.
const MOBILE_ID_OVERRIDES: Record<string, string> = {
  'tour-stats': 'tour-dashboard-mobile',
  'tour-my-shop': 'tour-my-shop-mobile',
  'tour-products': 'tour-products-mobile',
  'tour-reviews': 'tour-reviews-mobile',
};

// Payments & Billing and Support & Help have no bottom-tab icon of their
// own on mobile — they only live inside the off-canvas drawer. For these
// steps the tour opens the drawer itself (see the drawer-control effect
// below) and points at the real link/button inside it, rather than
// vaguely gesturing at the "More" button.
const MOBILE_DRAWER_STEP_IDS = new Set(['tour-payments-billing', 'tour-support']);

// The tour navigates the seller to the real page behind each of these
// steps (rather than just highlighting a tab) so they can see what the
// bubble is describing. Payments & Billing/Support intentionally aren't
// included — they have no bottom-tab icon on mobile and are instead
// revealed via the off-canvas drawer (see MOBILE_DRAWER_STEP_IDS above),
// which already works the same regardless of which page is behind it.
const STEP_TO_ROUTE: Record<string, string> = {
  'tour-stats': '/dashboard',
  'tour-view-shop': '/dashboard',
  'tour-my-shop': '/my-shop',
  'tour-products': '/products',
  'tour-reviews': '/reviews',
};

// Maps a step to the Sidebar NAV_ITEMS `tourId` it corresponds to, so the
// bottom tab bar's active/highlighted tab can follow the tour on mobile
// instead of staying stuck on whatever the real current route is.
const STEP_TO_NAV_TOUR_ID: Record<string, string> = {
  'tour-stats': 'dashboard',
  'tour-my-shop': 'my-shop',
  'tour-products': 'products',
  'tour-reviews': 'reviews',
};

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
}

type Rect = { top: number; left: number; width: number; height: number };

export default function OnboardingTour({ autoShow, hasViewShopButton }: OnboardingTourProps) {
  const { visible, stepIndex, hasViewShopButton: hasViewShopButtonInStore } = useTourState();
  const [rect, setRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const steps = hasViewShopButtonInStore ? STEPS : STEPS.filter((s) => s.id !== 'tour-view-shop');

  useEffect(() => setMounted(true), []);

  // Only the Dashboard page passes a real hasViewShopButton value — record
  // it in the shared store so every page's step list agrees on whether
  // the "Preview Your Shop" step exists.
  useEffect(() => {
    if (hasViewShopButton !== undefined) setTourHasViewShopButton(hasViewShopButton);
  }, [hasViewShopButton]);

  // Auto-show on first mount if the owner hasn't seen it yet. Guarded by
  // `!visible` so this doesn't reset an already-in-progress tour back to
  // step 0 whenever the tour's own navigation brings the seller back to
  // the Dashboard page (which remounts this component).
  useEffect(() => {
    if (autoShow && !visible) startDashboardTour();
    // Only ever check this once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStep = steps[stepIndex];

  // Navigate to the real page behind the current step (e.g. /my-shop for
  // the "My Shop" step) so the seller sees what the bubble is describing,
  // instead of just a highlighted tab. No-op if already on that page.
  useEffect(() => {
    if (!visible || !currentStep) return;
    const targetRoute = STEP_TO_ROUTE[currentStep.id];
    if (targetRoute && targetRoute !== pathname) {
      router.push(targetRoute);
    }
  }, [visible, currentStep, pathname, router]);

  const recalcRect = useCallback(() => {
    if (!currentStep) return;
    const mobile = isMobileViewport();
    const targetId = (mobile && MOBILE_ID_OVERRIDES[currentStep.id]) || currentStep.id;
    const el = document.getElementById(targetId);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [currentStep]);

  // Targets like the stats grid or "View Shop" button can be below the
  // fold on a scrolled phone screen — bring them into view before
  // measuring, otherwise the bubble/spotlight would point at nothing.
  useEffect(() => {
    if (!visible || !currentStep) return;
    const mobile = isMobileViewport();
    const targetId = (mobile && MOBILE_ID_OVERRIDES[currentStep.id]) || currentStep.id;
    const el = document.getElementById(targetId);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, currentStep]);

  // Steps that live inside the off-canvas drawer (Payments & Billing,
  // Support & Help) need the drawer opened on mobile before their target
  // element is visible/measurable; every other step should keep it
  // closed. The drawer slides in with a 250ms CSS transition, so give it
  // a moment to finish before re-measuring.
  useEffect(() => {
    if (!visible || !currentStep) return;
    if (!isMobileViewport()) return;
    if (MOBILE_DRAWER_STEP_IDS.has(currentStep.id)) {
      openMobileNav();
    } else {
      closeMobileNav();
    }
    const timeout = setTimeout(recalcRect, 280);
    return () => clearTimeout(timeout);
  }, [visible, currentStep, recalcRect]);

  // Make sure the drawer never lingers open once the tour ends.
  useEffect(() => {
    if (!visible) closeMobileNav();
  }, [visible]);

  // Keep the bottom tab bar's active/highlighted tab in sync with the
  // current step on mobile, so it's obvious which tab the bubble is
  // describing even before the user has navigated there. Cleared whenever
  // the tour isn't visible so normal pathname-based highlighting resumes.
  useEffect(() => {
    if (!visible || !currentStep || !isMobileViewport()) {
      setTourActiveTab(null);
      return;
    }
    setTourActiveTab(STEP_TO_NAV_TOUR_ID[currentStep.id] ?? null);
  }, [visible, currentStep]);

  // Never leave the override in place if this component unmounts mid-tour.
  useEffect(() => () => setTourActiveTab(null), []);

  useEffect(() => {
    if (!visible) return;
    recalcRect();
    window.addEventListener('resize', recalcRect);
    window.addEventListener('scroll', recalcRect, true);
    return () => {
      window.removeEventListener('resize', recalcRect);
      window.removeEventListener('scroll', recalcRect, true);
    };
  }, [visible, recalcRect]);

  // If the current step's target isn't in the DOM (e.g. mid-render),
  // give layout a tick to settle then recheck; skip forward if it still
  // never appears.
  useEffect(() => {
    if (!visible || !currentStep) return;
    if (rect) return;
    const timeout = setTimeout(() => {
      recalcRect();
    }, 150);
    return () => clearTimeout(timeout);
  }, [visible, currentStep, rect, recalcRect]);

  const finish = useCallback(() => {
    hideDashboardTour();
    closeMobileNav();
    fetch('/api/shop/tour-complete', { method: 'POST' }).catch(() => {});
  }, []);

  function handleNext() {
    if (stepIndex >= steps.length - 1) {
      finish();
      return;
    }
    setTourStepIndex(stepIndex + 1);
  }

  function handleBack() {
    setTourStepIndex(Math.max(0, stepIndex - 1));
  }

  if (!mounted || !visible || !currentStep) return null;

  const isLastStep = stepIndex === steps.length - 1;

  // Bubble placement: prefer below the target; flip above if there isn't
  // enough room at the bottom of the viewport. Horizontally clamped so it
  // never runs off-screen. Width shrinks on narrow phones (e.g. iPhone SE)
  // so it never overflows the viewport.
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const BUBBLE_WIDTH = Math.min(300, viewportWidth - 24);
  const GAP = 14;
  let bubbleLeft: number;
  let placement: 'below' | 'above' = 'below';
  // For 'below' we anchor via `top`; for 'above' we anchor via `bottom`
  // instead of computing `top` from the (unknown-until-rendered) bubble
  // height — anchoring from the bottom guarantees the bubble sits fully
  // above the target regardless of how tall its text wraps to, which
  // matters most on mobile where targets (e.g. the bottom nav) sit right
  // at the edge of the screen.
  let bubbleTop: number | undefined;
  let bubbleBottom: number | undefined;

  if (rect) {
    const spaceBelow = viewportHeight - (rect.top + rect.height);
    placement = spaceBelow < 220 && rect.top > 220 ? 'above' : 'below';
    if (placement === 'below') {
      bubbleTop = rect.top + rect.height + GAP;
    } else {
      bubbleBottom = viewportHeight - rect.top + GAP;
    }
    bubbleLeft = Math.min(Math.max(rect.left + rect.width / 2 - BUBBLE_WIDTH / 2, 12), viewportWidth - BUBBLE_WIDTH - 12);
  } else {
    // No target found — center the bubble as a fallback so the tour never
    // silently breaks.
    bubbleTop = viewportHeight / 2 - 80;
    bubbleLeft = viewportWidth / 2 - BUBBLE_WIDTH / 2;
  }

  return createPortal(
    <>
      {/* Dimmed backdrop with a spotlight cutout around the target element */}
      <div
        className="fixed inset-0 z-590 transition-all duration-200"
        style={
          rect
            ? {
                top: rect.top - 6,
                left: rect.left - 6,
                width: rect.width + 12,
                height: rect.height + 12,
                position: 'fixed',
                borderRadius: 12,
                boxShadow: '0 0 0 9999px rgba(15, 12, 30, 0.6)',
              }
            : { boxShadow: '0 0 0 9999px rgba(15, 12, 30, 0.6)' }
        }
        aria-hidden="true"
      />

      <div
        className="fixed z-600 flex flex-col gap-3 rounded-[14px] border border-[#e2e3e6] bg-white p-4.5 text-[#1d2734] shadow-[0_16px_40px_rgba(0,0,0,0.25)]"
        style={{ top: bubbleTop, bottom: bubbleBottom, left: bubbleLeft, width: BUBBLE_WIDTH }}
      >
        {rect && (
          <div
            className={`absolute h-3 w-3 rotate-45 border border-[#e2e3e6] bg-white ${
              placement === 'below' ? '-top-1.5 border-b-0 border-r-0' : '-bottom-1.5 border-t-0 border-l-0'
            }`}
            style={{ left: Math.min(Math.max(rect.left + rect.width / 2 - bubbleLeft - 6, 12), BUBBLE_WIDTH - 24) }}
          />
        )}

        <div className="flex items-center justify-between">
          <span className="text-[0.68rem] font-bold uppercase tracking-wide text-[#6c5ce7]">
            Step {stepIndex + 1} of {steps.length}
          </span>
          <button
            type="button"
            onClick={finish}
            className="text-[0.72rem] font-semibold text-[#6b7280] hover:text-[#1d2734]"
          >
            Skip tour
          </button>
        </div>

        <div>
          <div className="mb-1 text-[0.95rem] font-extrabold">{currentStep.title}</div>
          <p className="text-[0.8rem] leading-snug text-[#4b5563]">{currentStep.body}</p>
        </div>

        <div className="mt-1 flex items-center justify-between">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="rounded-[9px] border border-[#e2e3e6] px-4 py-2 text-[0.8rem] font-bold text-[#4b5563] hover:bg-[#f8f9fa]"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={handleNext}
            className="rounded-[9px] bg-[#1e8b4a] px-4 py-2 text-[0.8rem] font-bold text-white hover:bg-[#197a40]"
          >
            {isLastStep ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

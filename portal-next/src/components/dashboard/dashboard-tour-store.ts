'use client';

import { useSyncExternalStore } from 'react';

// Global onboarding-tour state, shared across every page it walks the
// seller through (Dashboard, My Shop, Products, Reviews, Payments &
// Billing). The tour needs to actually navigate between these pages so
// the seller sees the real page behind each step (not just a highlighted
// tab), and since Next.js unmounts a page's whole component tree on
// route change, each page mounts its own <OnboardingTour> instance —
// they all read/write this single shared store so the tour picks up
// exactly where it left off instead of resetting on navigation. Also
// powers Sidebar's "Take the tour again" link.
type TourState = {
  visible: boolean;
  stepIndex: number;
  // Whether the "View Shop" step exists. Only the Dashboard page knows
  // this for sure (it depends on server-fetched data) — other pages leave
  // it alone rather than overwriting a correct value with a guess.
  hasViewShopButton: boolean;
};

let state: TourState = { visible: false, stepIndex: 0, hasViewShopButton: true };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(patch: Partial<TourState>) {
  state = { ...state, ...patch };
  emit();
}

export function startDashboardTour() {
  setState({ visible: true, stepIndex: 0 });
}

// Kept as the exported name Sidebar's "Take the tour again" link already
// calls.
export const replayDashboardTour = startDashboardTour;

export function hideDashboardTour() {
  setState({ visible: false });
}

export function setTourStepIndex(index: number) {
  setState({ stepIndex: index });
}

export function setTourHasViewShopButton(value: boolean) {
  if (state.hasViewShopButton === value) return;
  setState({ hasViewShopButton: value });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function getServerSnapshot(): TourState {
  return { visible: false, stepIndex: 0, hasViewShopButton: true };
}

export function useTourState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

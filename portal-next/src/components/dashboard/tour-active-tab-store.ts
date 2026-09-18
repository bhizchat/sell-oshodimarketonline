'use client';

import { useSyncExternalStore } from 'react';

// Tiny cross-component pub/sub so OnboardingTour can tell Sidebar's mobile
// bottom tab bar which tab to visually highlight as "active" while the
// tour is pointing at it — on mobile the tour's current step doesn't
// always match the actual current route (e.g. the tour is still on
// /dashboard while showing the "My Shop" step), so without this the
// purple active-tab indicator would stay stuck on Dashboard the whole
// time, making it unclear which tab the bubble is describing. Mirrors
// mobile-nav-store.ts / dashboard-tour-store.ts.
let activeTab: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

// `tourId` matches Sidebar's NAV_ITEMS[].tourId (e.g. 'dashboard',
// 'my-shop'), or null to fall back to normal pathname-based highlighting.
export function setTourActiveTab(tourId: string | null) {
  if (activeTab === tourId) return;
  activeTab = tourId;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return activeTab;
}

function getServerSnapshot() {
  return null;
}

export function useTourActiveTab() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

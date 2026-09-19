'use client';

import { useSyncExternalStore } from 'react';

// Tiny cross-component pub/sub so "Take the tour again" (in Sidebar's
// Support & Help popover) can re-trigger OnboardingTour, which renders as
// a sibling elsewhere on the dashboard page — mirrors mobile-nav-store.ts.
let replaySignal = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function replayDashboardTour() {
  replaySignal += 1;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return replaySignal;
}

function getServerSnapshot() {
  return 0;
}

// Returns a number that changes every time replayDashboardTour() is
// called — consumers should watch it with a useEffect to re-open the tour.
export function useTourReplaySignal() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

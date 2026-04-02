import { writable } from 'svelte/store';
import type { Hold } from '@domain/models/hold';
import { holdService } from '@services/container';

export const activeHolds = writable<Hold[]>([]);
export const holdError = writable<string | null>(null);

let unsubChange: (() => void) | null = null;
let currentTripId: string | null = null;

export function initHoldStore(tripId: string) {
  currentTripId = tripId;
  unsubChange?.();
  unsubChange = holdService.onChange(() => {
    if (currentTripId) refreshHolds(currentTripId);
  });
  refreshHolds(tripId);
  holdService.initTimersForTrip(tripId);
}

export async function refreshHolds(tripId: string) {
  try {
    const holds = await holdService.getActiveHoldsForTrip(tripId);
    activeHolds.set(holds);
  } catch (e) {
    holdError.set(e instanceof Error ? e.message : 'Failed to load holds');
  }
}

export async function placeHold(tripId: string, seatMapEntryId: string, userId: string) {
  holdError.set(null);
  try {
    await holdService.placeSeatHold(tripId, seatMapEntryId, userId);
  } catch (e) {
    holdError.set(e instanceof Error ? e.message : 'Failed to place hold');
    throw e;
  }
}

export async function releaseHold(holdId: string, userId: string) {
  holdError.set(null);
  try {
    await holdService.releaseSeatHold(holdId, userId);
  } catch (e) {
    holdError.set(e instanceof Error ? e.message : 'Failed to release hold');
    throw e;
  }
}

export async function confirmHold(holdId: string, userId: string) {
  holdError.set(null);
  try {
    await holdService.confirmSeatHold(holdId, userId);
  } catch (e) {
    holdError.set(e instanceof Error ? e.message : 'Failed to confirm hold');
    throw e;
  }
}

export function destroyHoldStore() {
  unsubChange?.();
  unsubChange = null;
  currentTripId = null;
}

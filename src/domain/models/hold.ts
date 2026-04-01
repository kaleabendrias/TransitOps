export type HoldStatus = 'active' | 'confirmed' | 'expired' | 'released';

export const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export interface Hold {
  readonly id: string;
  readonly tripId: string;
  readonly seatMapEntryId: string;
  readonly userId: string;
  readonly tabId: string;
  readonly status: HoldStatus;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly releasedAt: number | null;
}

export function createHold(params: {
  tripId: string;
  seatMapEntryId: string;
  userId: string;
  tabId: string;
}): Hold {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    tripId: params.tripId,
    seatMapEntryId: params.seatMapEntryId,
    userId: params.userId,
    tabId: params.tabId,
    status: 'active',
    createdAt: now,
    expiresAt: now + HOLD_DURATION_MS,
    releasedAt: null,
  };
}

export function isHoldExpired(hold: Hold): boolean {
  return hold.status === 'active' && Date.now() >= hold.expiresAt;
}

export function remainingMs(hold: Hold): number {
  if (hold.status !== 'active') return 0;
  return Math.max(0, hold.expiresAt - Date.now());
}

export function expireHold(hold: Hold): Hold {
  return { ...hold, status: 'expired', releasedAt: Date.now() };
}

export function releaseHold(hold: Hold): Hold {
  return { ...hold, status: 'released', releasedAt: Date.now() };
}

export function confirmHold(hold: Hold): Hold {
  return { ...hold, status: 'confirmed' };
}

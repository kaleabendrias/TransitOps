import type { Hold } from '../models/hold';
import type { SeatMapEntry } from '../models/seat-map';
import { isHoldExpired } from '../models/hold';

export function canPlaceHold(seat: SeatMapEntry, existingHold: Hold | null): string | null {
  if (!seat.selectable) {
    return `Seat ${seat.label} is not selectable (${seat.seatType})`;
  }
  if (existingHold && existingHold.status === 'active' && !isHoldExpired(existingHold)) {
    return `Seat ${seat.label} is already held`;
  }
  return null;
}

export function canReleaseHold(hold: Hold, userId: string): string | null {
  if (hold.status !== 'active') {
    return `Hold is not active (status: ${hold.status})`;
  }
  if (hold.userId !== userId) {
    return 'Only the hold owner can release this hold';
  }
  return null;
}

export function canConfirmHold(hold: Hold, userId: string): string | null {
  if (hold.status !== 'active') {
    return `Hold is not active (status: ${hold.status})`;
  }
  if (isHoldExpired(hold)) {
    return 'Hold has expired';
  }
  if (hold.userId !== userId) {
    return 'Only the hold owner can confirm this hold';
  }
  return null;
}

export function shouldAutoRelease(hold: Hold): boolean {
  return hold.status === 'active' && isHoldExpired(hold);
}

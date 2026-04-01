import type { Hold } from '@domain/models/hold';
import { createHold, expireHold, releaseHold, confirmHold, isHoldExpired, remainingMs } from '@domain/models/hold';
import { canPlaceHold, canReleaseHold, canConfirmHold, shouldAutoRelease } from '@domain/policies/hold-policy';
import type { HoldRepository } from '@domain/ports/hold-repository';
import type { SeatMapRepository } from '@domain/ports/seat-map-repository';
import { holdSyncBus, type HoldSyncMessage } from './hold-sync';
import { getTabId } from './tab-id';

type HoldChangeListener = () => void;

export class HoldService {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private listeners: Set<HoldChangeListener> = new Set();
  private unsubSync: (() => void) | null = null;

  constructor(
    private readonly holdRepo: HoldRepository,
    private readonly seatMapRepo: SeatMapRepository
  ) {
    this.unsubSync = holdSyncBus.subscribe((msg) => this.handleSyncMessage(msg));
  }

  onChange(listener: HoldChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyChange(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  async placeSeatHold(tripId: string, seatMapEntryId: string, userId: string): Promise<Hold> {
    const seat = await this.seatMapRepo.getById(seatMapEntryId);
    if (!seat) throw new Error(`Seat ${seatMapEntryId} not found`);

    const existing = await this.holdRepo.getActiveBySeat(seatMapEntryId);

    // Auto-expire stale holds before checking
    if (existing && shouldAutoRelease(existing)) {
      const expired = expireHold(existing);
      await this.holdRepo.save(expired);
      this.clearTimer(existing.id);
      holdSyncBus.broadcast({ type: 'hold_expired', holdId: existing.id, seatMapEntryId });
    } else {
      const error = canPlaceHold(seat, existing);
      if (error) throw new Error(error);
    }

    const hold = createHold({ tripId, seatMapEntryId, userId, tabId: getTabId() });
    await this.holdRepo.save(hold);
    this.startAutoReleaseTimer(hold);

    holdSyncBus.broadcast({
      type: 'hold_placed',
      holdId: hold.id,
      seatMapEntryId,
      userId,
      expiresAt: hold.expiresAt,
    });

    this.notifyChange();
    return hold;
  }

  async releaseSeatHold(holdId: string, userId: string): Promise<void> {
    const hold = await this.holdRepo.getById(holdId);
    if (!hold) throw new Error(`Hold ${holdId} not found`);

    const error = canReleaseHold(hold, userId);
    if (error) throw new Error(error);

    const released = releaseHold(hold);
    await this.holdRepo.save(released);
    this.clearTimer(holdId);

    holdSyncBus.broadcast({
      type: 'hold_released',
      holdId: hold.id,
      seatMapEntryId: hold.seatMapEntryId,
    });

    this.notifyChange();
  }

  async confirmSeatHold(holdId: string, userId: string): Promise<Hold> {
    const hold = await this.holdRepo.getById(holdId);
    if (!hold) throw new Error(`Hold ${holdId} not found`);

    // Check expiry first
    if (isHoldExpired(hold)) {
      const expired = expireHold(hold);
      await this.holdRepo.save(expired);
      this.clearTimer(holdId);
      holdSyncBus.broadcast({
        type: 'hold_expired',
        holdId: hold.id,
        seatMapEntryId: hold.seatMapEntryId,
      });
      this.notifyChange();
      throw new Error('Hold has expired');
    }

    const error = canConfirmHold(hold, userId);
    if (error) throw new Error(error);

    const confirmed = confirmHold(hold);
    await this.holdRepo.save(confirmed);
    this.clearTimer(holdId);

    holdSyncBus.broadcast({
      type: 'hold_confirmed',
      holdId: hold.id,
      seatMapEntryId: hold.seatMapEntryId,
    });

    this.notifyChange();
    return confirmed;
  }

  async getActiveHoldsForTrip(tripId: string): Promise<Hold[]> {
    const holds = await this.holdRepo.getByTrip(tripId);
    const active: Hold[] = [];
    for (const h of holds) {
      if (h.status !== 'active') continue;
      if (shouldAutoRelease(h)) {
        const expired = expireHold(h);
        await this.holdRepo.save(expired);
        this.clearTimer(h.id);
      } else {
        active.push(h);
      }
    }
    return active;
  }

  async getActiveBySeat(seatMapEntryId: string): Promise<Hold | null> {
    const hold = await this.holdRepo.getActiveBySeat(seatMapEntryId);
    if (!hold) return null;
    if (shouldAutoRelease(hold)) {
      const expired = expireHold(hold);
      await this.holdRepo.save(expired);
      this.clearTimer(hold.id);
      return null;
    }
    return hold;
  }

  getRemainingMs(hold: Hold): number {
    return remainingMs(hold);
  }

  async sweepExpiredHolds(): Promise<number> {
    const active = await this.holdRepo.getAllActive();
    let count = 0;
    for (const hold of active) {
      if (shouldAutoRelease(hold)) {
        const expired = expireHold(hold);
        await this.holdRepo.save(expired);
        this.clearTimer(hold.id);
        holdSyncBus.broadcast({
          type: 'hold_expired',
          holdId: hold.id,
          seatMapEntryId: hold.seatMapEntryId,
        });
        count++;
      }
    }
    if (count > 0) this.notifyChange();
    return count;
  }

  async initTimersForTrip(tripId: string): Promise<void> {
    const active = await this.getActiveHoldsForTrip(tripId);
    for (const hold of active) {
      if (!this.timers.has(hold.id)) {
        this.startAutoReleaseTimer(hold);
      }
    }
  }

  private startAutoReleaseTimer(hold: Hold): void {
    this.clearTimer(hold.id);
    const ms = remainingMs(hold);
    if (ms <= 0) {
      this.autoExpire(hold.id);
      return;
    }
    const timer = setTimeout(() => this.autoExpire(hold.id), ms);
    this.timers.set(hold.id, timer);
  }

  private async autoExpire(holdId: string): Promise<void> {
    this.clearTimer(holdId);
    const hold = await this.holdRepo.getById(holdId);
    if (!hold || hold.status !== 'active') return;

    const expired = expireHold(hold);
    await this.holdRepo.save(expired);

    holdSyncBus.broadcast({
      type: 'hold_expired',
      holdId: hold.id,
      seatMapEntryId: hold.seatMapEntryId,
    });

    this.notifyChange();
  }

  private clearTimer(holdId: string): void {
    const existing = this.timers.get(holdId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(holdId);
    }
  }

  private handleSyncMessage(_msg: HoldSyncMessage): void {
    // Another tab changed holds — refresh our state
    this.notifyChange();
  }

  async getConfirmedSeatIds(tripId: string): Promise<Set<string>> {
    const holds = await this.holdRepo.getByTrip(tripId);
    return new Set(
      holds.filter((h) => h.status === 'confirmed').map((h) => h.seatMapEntryId)
    );
  }

  destroy(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.listeners.clear();
    this.unsubSync?.();
  }
}

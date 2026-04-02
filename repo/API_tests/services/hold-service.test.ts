import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HoldService } from '@services/hold-service';
import { HoldRepositoryIDB } from '@adapters/indexeddb/hold-repository-idb';
import { SeatMapRepositoryIDB } from '@adapters/indexeddb/seat-map-repository-idb';
import { createSeatMapEntry } from '@domain/models/seat-map';

const actor = { userId: 'test', role: 'administrator' as const };

describe('HoldService', () => {
  let svc: HoldService;
  let holdRepo: HoldRepositoryIDB;
  let seatMapRepo: SeatMapRepositoryIDB;

  beforeEach(() => {
    holdRepo = new HoldRepositoryIDB();
    seatMapRepo = new SeatMapRepositoryIDB();
    svc = new HoldService(holdRepo, seatMapRepo);
  });

  afterEach(() => { svc.destroy(); });

  it('places a hold on selectable seat', async () => {
    const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    await seatMapRepo.save(seat);

    const hold = await svc.placeSeatHold('t1', seat.id, 'u1', actor);
    expect(hold.status).toBe('active');
    expect(hold.seatMapEntryId).toBe(seat.id);
    expect(hold.expiresAt).toBeGreaterThan(Date.now());
  });

  it('rejects hold on non-selectable seat', async () => {
    const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1, seatType: 'ada' });
    await seatMapRepo.save(seat);
    await expect(svc.placeSeatHold('t1', seat.id, 'u1', actor)).rejects.toThrow('not selectable');
  });

  it('rejects hold on already-held seat', async () => {
    const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    await seatMapRepo.save(seat);
    await svc.placeSeatHold('t1', seat.id, 'u1', actor);
    await expect(svc.placeSeatHold('t1', seat.id, 'u2', actor)).rejects.toThrow('already held');
  });

  it('releases a hold', async () => {
    const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    await seatMapRepo.save(seat);
    const hold = await svc.placeSeatHold('t1', seat.id, 'u1', actor);

    await svc.releaseSeatHold(hold.id, 'u1', actor);
    const active = await svc.getActiveBySeat(seat.id);
    expect(active).toBeNull();
  });

  it('release rejects non-owner', async () => {
    const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    await seatMapRepo.save(seat);
    const hold = await svc.placeSeatHold('t1', seat.id, 'u1', actor);
    await expect(svc.releaseSeatHold(hold.id, 'u2', actor)).rejects.toThrow('owner');
  });

  it('confirms a hold', async () => {
    const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    await seatMapRepo.save(seat);
    const hold = await svc.placeSeatHold('t1', seat.id, 'u1', actor);

    const confirmed = await svc.confirmSeatHold(hold.id, 'u1', actor);
    expect(confirmed.status).toBe('confirmed');
  });

  it('confirm rejects expired hold', async () => {
    const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    await seatMapRepo.save(seat);
    const hold = await svc.placeSeatHold('t1', seat.id, 'u1', actor);

    // Manually expire the hold
    const expired = { ...hold, expiresAt: Date.now() - 1000 };
    await holdRepo.save(expired);

    await expect(svc.confirmSeatHold(hold.id, 'u1', actor)).rejects.toThrow('expired');
  });

  it('sweepExpiredHolds cleans up', async () => {
    const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    await seatMapRepo.save(seat);
    const hold = await svc.placeSeatHold('t1', seat.id, 'u1', actor);

    // Manually expire
    await holdRepo.save({ ...hold, expiresAt: Date.now() - 1000 });

    const count = await svc.sweepExpiredHolds();
    expect(count).toBe(1);
  });

  it('getActiveHoldsForTrip excludes expired', async () => {
    const s1 = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    const s2 = createSeatMapEntry({ tripId: 't1', row: 1, number: 2 });
    await seatMapRepo.save(s1);
    await seatMapRepo.save(s2);

    const h1 = await svc.placeSeatHold('t1', s1.id, 'u1', actor);
    await svc.placeSeatHold('t1', s2.id, 'u2', actor);

    // Expire h1
    await holdRepo.save({ ...h1, expiresAt: Date.now() - 1000 });

    const active = await svc.getActiveHoldsForTrip('t1');
    expect(active.length).toBe(1);
  });

  it('getConfirmedSeatIds returns confirmed seat IDs', async () => {
    const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    await seatMapRepo.save(seat);
    const hold = await svc.placeSeatHold('t1', seat.id, 'u1', actor);
    await svc.confirmSeatHold(hold.id, 'u1', actor);

    const ids = await svc.getConfirmedSeatIds('t1');
    expect(ids.has(seat.id)).toBe(true);
  });

  it('getRemainingMs returns positive for active', async () => {
    const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    await seatMapRepo.save(seat);
    const hold = await svc.placeSeatHold('t1', seat.id, 'u1', actor);
    expect(svc.getRemainingMs(hold)).toBeGreaterThan(0);
  });

  it('onChange listener fires on state changes', async () => {
    const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    await seatMapRepo.save(seat);

    let changeCount = 0;
    const unsub = svc.onChange(() => { changeCount++; });

    await svc.placeSeatHold('t1', seat.id, 'u1', actor);
    expect(changeCount).toBeGreaterThan(0);
    unsub();
  });

  it('rejects operations on nonexistent seat/hold', async () => {
    await expect(svc.placeSeatHold('t', 'bogus', 'u', actor)).rejects.toThrow('not found');
    await expect(svc.releaseSeatHold('bogus', 'u', actor)).rejects.toThrow('not found');
    await expect(svc.confirmSeatHold('bogus', 'u', actor)).rejects.toThrow('not found');
  });

  it('auto-expires stale hold when placing new one', async () => {
    const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    await seatMapRepo.save(seat);
    const hold = await svc.placeSeatHold('t1', seat.id, 'u1', actor);

    // Manually expire the first hold
    await holdRepo.save({ ...hold, expiresAt: Date.now() - 1000 });

    // Now a new user can place a hold (the old one gets auto-expired)
    const newHold = await svc.placeSeatHold('t1', seat.id, 'u2', actor);
    expect(newHold.userId).toBe('u2');
  });
});

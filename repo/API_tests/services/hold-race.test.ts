import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HoldService } from '@services/hold-service';
import { HoldRepositoryIDB } from '@adapters/indexeddb/hold-repository-idb';
import { SeatMapRepositoryIDB } from '@adapters/indexeddb/seat-map-repository-idb';
import { createSeatMapEntry } from '@domain/models/seat-map';

const actor = { userId: 'test', role: 'administrator' as const };

describe('Multi-tab seat hold race condition', () => {
  let svc1: HoldService;
  let svc2: HoldService;
  let holdRepo: HoldRepositoryIDB;
  let seatMapRepo: SeatMapRepositoryIDB;

  beforeEach(() => {
    holdRepo = new HoldRepositoryIDB();
    seatMapRepo = new SeatMapRepositoryIDB();
    // Two service instances simulating two browser tabs sharing IDB
    svc1 = new HoldService(holdRepo, seatMapRepo);
    svc2 = new HoldService(holdRepo, seatMapRepo);
  });

  afterEach(() => {
    svc1.destroy();
    svc2.destroy();
  });

  it('second tab cannot hold a seat already held by first tab', async () => {
    const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    await seatMapRepo.save(seat);

    await svc1.placeSeatHold('t1', seat.id, 'userA', actor);
    await expect(svc2.placeSeatHold('t1', seat.id, 'userB', actor)).rejects.toThrow('already held');
  });

  it('second tab can hold seat after first tab releases', async () => {
    const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    await seatMapRepo.save(seat);

    const hold = await svc1.placeSeatHold('t1', seat.id, 'userA', actor);
    await svc1.releaseSeatHold(hold.id, 'userA', actor);
    const hold2 = await svc2.placeSeatHold('t1', seat.id, 'userB', actor);
    expect(hold2.userId).toBe('userB');
  });

  it('expired hold from tab1 allows tab2 to acquire', async () => {
    const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    await seatMapRepo.save(seat);

    const hold = await svc1.placeSeatHold('t1', seat.id, 'userA', actor);
    // Simulate expiry by writing expired hold directly
    await holdRepo.save({ ...hold, expiresAt: Date.now() - 1000 });

    // Tab2 auto-expires stale hold and acquires
    const hold2 = await svc2.placeSeatHold('t1', seat.id, 'userB', actor);
    expect(hold2.userId).toBe('userB');
  });

  it('concurrent holds on different seats succeed independently', async () => {
    const seat1 = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    const seat2 = createSeatMapEntry({ tripId: 't1', row: 1, number: 2 });
    await seatMapRepo.save(seat1);
    await seatMapRepo.save(seat2);

    const [h1, h2] = await Promise.all([
      svc1.placeSeatHold('t1', seat1.id, 'userA', actor),
      svc2.placeSeatHold('t1', seat2.id, 'userB', actor),
    ]);
    expect(h1.seatMapEntryId).toBe(seat1.id);
    expect(h2.seatMapEntryId).toBe(seat2.id);
  });

  it('sweepExpiredHolds visible across tabs', async () => {
    const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    await seatMapRepo.save(seat);

    const hold = await svc1.placeSeatHold('t1', seat.id, 'userA', actor);
    await holdRepo.save({ ...hold, expiresAt: Date.now() - 1000 });

    // Tab2 sweeps expired holds
    const count = await svc2.sweepExpiredHolds();
    expect(count).toBe(1);

    // Tab1 sees the seat as free
    const active = await svc1.getActiveBySeat(seat.id);
    expect(active).toBeNull();
  });
});

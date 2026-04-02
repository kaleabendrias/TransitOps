import { describe, it, expect, beforeEach } from 'vitest';
import { SeatService } from '@services/seat-service';
import { SeatRepositoryIDB } from '@adapters/indexeddb/seat-repository-idb';
import { createSeat } from '@domain/models/seat';
import type { ServiceActor } from '@services/service-actor';

describe('SeatService', () => {
  let svc: SeatService;
  let repo: SeatRepositoryIDB;
  const actor: ServiceActor = { userId: 'u1', role: 'dispatcher' };

  beforeEach(() => { repo = new SeatRepositoryIDB(); svc = new SeatService(repo); });

  it('retrieves seats for venue', async () => {
    await repo.save(createSeat({ venueId: 'v1', row: 1, number: 1 }));
    await repo.save(createSeat({ venueId: 'v1', row: 1, number: 2 }));
    expect((await svc.getSeatsForVenue('v1')).length).toBe(2);
  });
  it('getSeat by id', async () => {
    const s = createSeat({ venueId: 'v1', row: 1, number: 1 });
    await repo.save(s);
    expect(await svc.getSeat(s.id)).not.toBeNull();
  });
  it('changeSeatStatus follows policy', async () => {
    const s = createSeat({ venueId: 'v1', row: 1, number: 1 });
    await repo.save(s);
    expect((await svc.reserveSeat(s.id, actor)).status).toBe('reserved');
  });
  it('reserveSeat, releaseSeat, blockSeat', async () => {
    const s = createSeat({ venueId: 'v1', row: 1, number: 1 });
    await repo.save(s);
    await svc.reserveSeat(s.id, actor);
    await svc.releaseSeat(s.id, actor);
    await svc.blockSeat(s.id, actor);
    expect((await svc.getSeat(s.id))!.status).toBe('blocked');
  });
  it('rejects invalid transition', async () => {
    const s = createSeat({ venueId: 'v1', row: 1, number: 1 });
    await repo.save(s);
    await expect(svc.changeSeatStatus(s.id, 'occupied', actor)).rejects.toThrow('Cannot');
  });
  it('rejects not found', async () => {
    await expect(svc.changeSeatStatus('bogus', 'reserved', actor)).rejects.toThrow('not found');
  });
});

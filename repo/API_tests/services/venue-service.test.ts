import { describe, it, expect, beforeEach } from 'vitest';
import { VenueService } from '@services/venue-service';
import { VenueRepositoryIDB } from '@adapters/indexeddb/venue-repository-idb';
import { SeatRepositoryIDB } from '@adapters/indexeddb/seat-repository-idb';
import type { ServiceActor } from '@services/service-actor';

describe('VenueService', () => {
  let svc: VenueService;
  let seatRepo: SeatRepositoryIDB;
  const actor: ServiceActor = { userId: 'u1', role: 'dispatcher' };

  beforeEach(() => { seatRepo = new SeatRepositoryIDB(); svc = new VenueService(new VenueRepositoryIDB(), seatRepo); });

  it('creates venue with auto-generated seats', async () => {
    const v = await svc.createVenue('Hall A', 3, 4, actor);
    expect(v.name).toBe('Hall A');
    expect((await seatRepo.getAll(v.id)).length).toBe(12);
  });
  it('listVenues returns all', async () => {
    await svc.createVenue('A', 1, 1, actor); await svc.createVenue('B', 1, 1, actor);
    expect((await svc.listVenues()).length).toBe(2);
  });
  it('getVenue by id', async () => {
    const v = await svc.createVenue('C', 2, 2, actor);
    expect((await svc.getVenue(v.id))!.name).toBe('C');
  });
  it('deleteVenue cascades to seats', async () => {
    const v = await svc.createVenue('D', 2, 2, actor);
    await svc.deleteVenue(v.id, actor);
    expect(await svc.getVenue(v.id)).toBeNull();
  });
  it('rejects exceeding max capacity', async () => {
    await expect(svc.createVenue('Huge', 100, 100, actor)).rejects.toThrow('exceeded');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { TripService } from '@services/trip-service';
import { TripRepositoryIDB } from '@adapters/indexeddb/trip-repository-idb';
import type { ServiceActor } from '@services/service-actor';

describe('TripService', () => {
  let svc: TripService;
  const dispActor: ServiceActor = { userId: 'u1', role: 'dispatcher' };
  const revActor: ServiceActor = { userId: 'u2', role: 'reviewer' };

  beforeEach(() => { svc = new TripService(new TripRepositoryIDB()); });

  it('creates and retrieves a trip', async () => {
    const t = await svc.createTrip('v1', 'Express', Date.now() + 86400000, 'u1', dispActor, 'Fast trip');
    expect(t.name).toBe('Express');
    expect(await svc.getTrip(t.id)).not.toBeNull();
  });

  it('lists all trips', async () => {
    await svc.createTrip('v1', 'A', Date.now(), 'u1', dispActor);
    await svc.createTrip('v1', 'B', Date.now(), 'u1', dispActor);
    expect((await svc.listTrips()).length).toBe(2);
  });

  it('filters by venue', async () => {
    await svc.createTrip('v1', 'A', Date.now(), 'u1', dispActor);
    await svc.createTrip('v2', 'B', Date.now(), 'u1', dispActor);
    expect((await svc.getTripsByVenue('v1')).length).toBe(1);
  });

  it('updates status', async () => {
    const t = await svc.createTrip('v1', 'T', Date.now(), 'u1', dispActor);
    const updated = await svc.updateStatus(t.id, 'published', dispActor);
    expect(updated.status).toBe('published');
  });

  it('updateStatus rejects not found', async () => {
    await expect(svc.updateStatus('bogus', 'published', dispActor)).rejects.toThrow('not found');
  });

  it('deletes trip', async () => {
    const t = await svc.createTrip('v1', 'T', Date.now(), 'u1', dispActor);
    await svc.deleteTrip(t.id, dispActor);
    expect(await svc.getTrip(t.id)).toBeNull();
  });

  it('reviewer cannot create trip', async () => {
    await expect(svc.createTrip('v1', 'X', Date.now(), 'u2', revActor)).rejects.toThrow('Access denied');
  });

  it('reviewer cannot delete trip', async () => {
    const t = await svc.createTrip('v1', 'T', Date.now(), 'u1', dispActor);
    await expect(svc.deleteTrip(t.id, revActor)).rejects.toThrow('Access denied');
  });
});

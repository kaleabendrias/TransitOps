import { describe, it, expect, beforeEach } from 'vitest';
import { SeatMapService } from '@services/seat-map-service';
import { SeatMapRepositoryIDB } from '@adapters/indexeddb/seat-map-repository-idb';
import { HoldRepositoryIDB } from '@adapters/indexeddb/hold-repository-idb';
import { createHold } from '@domain/models/hold';
import type { ServiceActor } from '@services/service-actor';

describe('SeatMapService', () => {
  let svc: SeatMapService;
  let holdRepo: HoldRepositoryIDB;
  const actor: ServiceActor = { userId: 'u1', role: 'dispatcher' };

  beforeEach(() => { holdRepo = new HoldRepositoryIDB(); svc = new SeatMapService(new SeatMapRepositoryIDB(), holdRepo); });

  it('generates seat map', async () => {
    const map = await svc.generateSeatMap('t1', 3, 4, [], [], actor);
    expect(map.length).toBe(12);
  });
  it('ADA and crew rows', async () => {
    const map = await svc.generateSeatMap('t1', 5, 3, [1], [5], actor);
    expect(map.filter(e => e.seatType === 'ada').length).toBe(3);
    expect(map.filter(e => e.seatType === 'crew').length).toBe(3);
  });
  it('regenerate replaces', async () => {
    await svc.generateSeatMap('t1', 2, 2, [], [], actor);
    expect((await svc.generateSeatMap('t1', 3, 3, [], [], actor)).length).toBe(9);
  });
  it('changeSeatType', async () => {
    const map = await svc.generateSeatMap('t1', 2, 2, [], [], actor);
    expect((await svc.changeSeatType(map[0].id, 'ada', actor)).seatType).toBe('ada');
  });
  it('changeSeatType rejects not found', async () => {
    await expect(svc.changeSeatType('bogus', 'ada', actor)).rejects.toThrow('not found');
  });
  it('getAvailability shows held seats', async () => {
    const map = await svc.generateSeatMap('t1', 1, 2, [], [], actor);
    await holdRepo.save(createHold({ tripId: 't1', seatMapEntryId: map[0].id, userId: 'u1', tabId: 'tab' }));
    const avail = await svc.getAvailability('t1');
    expect(avail.find(a => a.entry.id === map[0].id)?.isHeld).toBe(true);
  });
  it('getAvailabilityCounts', async () => {
    const map = await svc.generateSeatMap('t1', 2, 2, [1], [], actor);
    await holdRepo.save(createHold({ tripId: 't1', seatMapEntryId: map.find(m => m.selectable)!.id, userId: 'u1', tabId: 'tab' }));
    const counts = await svc.getAvailabilityCounts('t1');
    expect(counts.nonSelectable).toBe(2);
    expect(counts.held).toBe(1);
  });
  it('deleteSeatMap', async () => {
    await svc.generateSeatMap('t1', 2, 2, [], [], actor);
    await svc.deleteSeatMap('t1', actor);
    expect((await svc.getSeatMap('t1')).length).toBe(0);
  });
});

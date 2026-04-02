import type { SeatMapEntry, SeatType } from '@domain/models/seat-map';
import { createSeatMapEntry, updateSeatType } from '@domain/models/seat-map';
import { calculateSeatScore } from '@domain/scoring';
import type { SeatMapRepository } from '@domain/ports/seat-map-repository';
import type { HoldRepository } from '@domain/ports/hold-repository';
import { shouldAutoRelease } from '@domain/policies/hold-policy';
import type { ServiceActor } from './service-actor';
import { requirePermission } from './service-actor';

export interface SeatAvailability {
  entry: SeatMapEntry;
  isHeld: boolean;
  holdUserId: string | null;
  holdExpiresAt: number | null;
}

export class SeatMapService {
  constructor(
    private readonly seatMapRepo: SeatMapRepository,
    private readonly holdRepo: HoldRepository
  ) {}

  async getSeatMap(tripId: string): Promise<SeatMapEntry[]> { return this.seatMapRepo.getByTrip(tripId); }

  async generateSeatMap(tripId: string, rows: number, seatsPerRow: number, adaRows: number[] = [], crewRows: number[] = [], actor: ServiceActor): Promise<SeatMapEntry[]> {
    requirePermission(actor, 'manage_seats');
    await this.seatMapRepo.deleteByTrip(tripId);
    const entries: SeatMapEntry[] = [];
    for (let r = 1; r <= rows; r++) {
      let seatType: SeatType = 'standard';
      if (adaRows.includes(r)) seatType = 'ada';
      else if (crewRows.includes(r)) seatType = 'crew';
      for (let s = 1; s <= seatsPerRow; s++) {
        const entry = createSeatMapEntry({ tripId, row: r, number: s, seatType });
        const score = calculateSeatScore({ ...entry, venueId: tripId, status: 'available' } as never, rows, seatsPerRow);
        entries.push({ ...entry, score });
      }
    }
    await this.seatMapRepo.saveBatch(entries);
    return entries;
  }

  async changeSeatType(entryId: string, seatType: SeatType, actor: ServiceActor): Promise<SeatMapEntry> {
    requirePermission(actor, 'manage_seats');
    const entry = await this.seatMapRepo.getById(entryId);
    if (!entry) throw new Error(`Seat map entry ${entryId} not found`);
    const updated = updateSeatType(entry, seatType);
    await this.seatMapRepo.save(updated);
    return updated;
  }

  async getAvailability(tripId: string): Promise<SeatAvailability[]> {
    const seats = await this.seatMapRepo.getByTrip(tripId);
    const holds = await this.holdRepo.getByTrip(tripId);
    const activeHolds = new Map<string, { userId: string; expiresAt: number }>();
    for (const h of holds) {
      if (h.status === 'active' && !shouldAutoRelease(h)) {
        activeHolds.set(h.seatMapEntryId, { userId: h.userId, expiresAt: h.expiresAt });
      }
    }
    return seats.map((entry) => {
      const hold = activeHolds.get(entry.id);
      return { entry, isHeld: !!hold, holdUserId: hold?.userId ?? null, holdExpiresAt: hold?.expiresAt ?? null };
    });
  }

  async getAvailabilityCounts(tripId: string) {
    const availability = await this.getAvailability(tripId);
    const holds = await this.holdRepo.getByTrip(tripId);
    const confirmedSeatIds = new Set(holds.filter((h) => h.status === 'confirmed').map((h) => h.seatMapEntryId));
    let selectable = 0, available = 0, held = 0, confirmed = 0, nonSelectable = 0;
    for (const a of availability) {
      if (!a.entry.selectable) { nonSelectable++; }
      else { selectable++; if (confirmedSeatIds.has(a.entry.id)) confirmed++; else if (a.isHeld) held++; else available++; }
    }
    return { total: availability.length, selectable, available, held, confirmed, nonSelectable };
  }

  async deleteSeatMap(tripId: string, actor: ServiceActor): Promise<void> {
    requirePermission(actor, 'manage_seats');
    await this.seatMapRepo.deleteByTrip(tripId);
  }
}

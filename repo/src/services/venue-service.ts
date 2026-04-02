import type { Venue } from '@domain/models/venue';
import { createVenue } from '@domain/models/venue';
import { createSeat } from '@domain/models/seat';
import { calculateSeatScore } from '@domain/scoring';
import { validateVenueCapacity } from '@domain/policies';
import type { VenueRepository } from '@domain/ports/venue-repository';
import type { SeatRepository } from '@domain/ports/seat-repository';
import { config } from '@config/index';
import type { ServiceActor } from './service-actor';
import { requirePermission } from './service-actor';

export class VenueService {
  constructor(
    private readonly venueRepo: VenueRepository,
    private readonly seatRepo: SeatRepository
  ) {}

  async listVenues(): Promise<Venue[]> { return this.venueRepo.getAll(); }
  async getVenue(id: string): Promise<Venue | null> { return this.venueRepo.getById(id); }

  async createVenue(name: string, rows: number, seatsPerRow: number, actor: ServiceActor): Promise<Venue> {
    requirePermission(actor, 'manage_seats');
    const totalSeats = rows * seatsPerRow;
    const capacityError = validateVenueCapacity(totalSeats, config.seats.maxPerVenue);
    if (capacityError) throw new Error(capacityError);

    const venue = createVenue({ name, rows, seatsPerRow });
    await this.venueRepo.save(venue);

    const seats = [];
    for (let r = 1; r <= rows; r++) {
      for (let s = 1; s <= seatsPerRow; s++) {
        const seat = createSeat({ venueId: venue.id, row: r, number: s });
        const score = calculateSeatScore(seat, rows, seatsPerRow);
        seats.push({ ...seat, score });
      }
    }
    await this.seatRepo.saveBatch(seats);
    return venue;
  }

  async deleteVenue(id: string, actor: ServiceActor): Promise<void> {
    requirePermission(actor, 'manage_seats');
    await this.seatRepo.deleteByVenue(id);
    await this.venueRepo.delete(id);
  }
}

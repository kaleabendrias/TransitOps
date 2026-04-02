import type { Seat, SeatStatus } from '@domain/models/seat';
import { updateSeatStatus } from '@domain/models/seat';
import { validateSeatTransition } from '@domain/policies';
import type { SeatRepository } from '@domain/ports/seat-repository';
import type { ServiceActor } from './service-actor';
import { requirePermission } from './service-actor';

export class SeatService {
  constructor(private readonly seatRepo: SeatRepository) {}

  async getSeatsForVenue(venueId: string): Promise<Seat[]> { return this.seatRepo.getAll(venueId); }
  async getSeat(id: string): Promise<Seat | null> { return this.seatRepo.getById(id); }

  async changeSeatStatus(seatId: string, newStatus: SeatStatus, actor: ServiceActor): Promise<Seat> {
    requirePermission(actor, 'manage_seats');
    const seat = await this.seatRepo.getById(seatId);
    if (!seat) throw new Error(`Seat ${seatId} not found`);
    const error = validateSeatTransition(seat, newStatus);
    if (error) throw new Error(error);
    const updated = updateSeatStatus(seat, newStatus);
    await this.seatRepo.save(updated);
    return updated;
  }

  async reserveSeat(seatId: string, actor: ServiceActor): Promise<Seat> { return this.changeSeatStatus(seatId, 'reserved', actor); }
  async releaseSeat(seatId: string, actor: ServiceActor): Promise<Seat> { return this.changeSeatStatus(seatId, 'available', actor); }
  async blockSeat(seatId: string, actor: ServiceActor): Promise<Seat> { return this.changeSeatStatus(seatId, 'blocked', actor); }
}

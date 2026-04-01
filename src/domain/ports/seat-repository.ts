import type { Seat } from '../models/seat';

export interface SeatRepository {
  getAll(venueId: string): Promise<Seat[]>;
  getById(id: string): Promise<Seat | null>;
  save(seat: Seat): Promise<void>;
  saveBatch(seats: Seat[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByVenue(venueId: string): Promise<void>;
}

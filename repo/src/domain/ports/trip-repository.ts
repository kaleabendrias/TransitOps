import type { Trip } from '../models/trip';

export interface TripRepository {
  getAll(): Promise<Trip[]>;
  getById(id: string): Promise<Trip | null>;
  getByVenue(venueId: string): Promise<Trip[]>;
  save(trip: Trip): Promise<void>;
  delete(id: string): Promise<void>;
}

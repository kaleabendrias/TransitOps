import type { Venue } from '../models/venue';

export interface VenueRepository {
  getAll(): Promise<Venue[]>;
  getById(id: string): Promise<Venue | null>;
  save(venue: Venue): Promise<void>;
  delete(id: string): Promise<void>;
}

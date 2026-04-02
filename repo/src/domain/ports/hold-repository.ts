import type { Hold } from '../models/hold';

export interface HoldRepository {
  getById(id: string): Promise<Hold | null>;
  getByTrip(tripId: string): Promise<Hold[]>;
  getActiveBySeat(seatMapEntryId: string): Promise<Hold | null>;
  getActiveByUser(userId: string): Promise<Hold[]>;
  save(hold: Hold): Promise<void>;
  delete(id: string): Promise<void>;
  getAllActive(): Promise<Hold[]>;
}

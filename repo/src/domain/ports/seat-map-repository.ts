import type { SeatMapEntry } from '../models/seat-map';

export interface SeatMapRepository {
  getByTrip(tripId: string): Promise<SeatMapEntry[]>;
  getById(id: string): Promise<SeatMapEntry | null>;
  save(entry: SeatMapEntry): Promise<void>;
  saveBatch(entries: SeatMapEntry[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByTrip(tripId: string): Promise<void>;
}

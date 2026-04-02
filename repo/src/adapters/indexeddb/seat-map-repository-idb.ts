import type { SeatMapEntry } from '@domain/models/seat-map';
import type { SeatMapRepository } from '@domain/ports/seat-map-repository';
import { getDb } from './db';

export class SeatMapRepositoryIDB implements SeatMapRepository {
  async getByTrip(tripId: string): Promise<SeatMapEntry[]> {
    const db = await getDb();
    return (await db.getAllFromIndex('seatMap', 'by-trip', tripId)) as SeatMapEntry[];
  }

  async getById(id: string): Promise<SeatMapEntry | null> {
    const db = await getDb();
    return ((await db.get('seatMap', id)) as SeatMapEntry) ?? null;
  }

  async save(entry: SeatMapEntry): Promise<void> {
    const db = await getDb();
    await db.put('seatMap', { ...entry });
  }

  async saveBatch(entries: SeatMapEntry[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('seatMap', 'readwrite');
    await Promise.all([...entries.map((e) => tx.store.put({ ...e })), tx.done]);
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('seatMap', id);
  }

  async deleteByTrip(tripId: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('seatMap', 'readwrite');
    const index = tx.store.index('by-trip');
    let cursor = await index.openCursor(tripId);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  }
}

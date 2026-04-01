import type { Seat } from '@domain/models/seat';
import type { SeatRepository } from '@domain/ports/seat-repository';
import { getDb } from './db';

export class SeatRepositoryIDB implements SeatRepository {
  async getAll(venueId: string): Promise<Seat[]> {
    const db = await getDb();
    return (await db.getAllFromIndex('seats', 'by-venue', venueId)) as Seat[];
  }

  async getById(id: string): Promise<Seat | null> {
    const db = await getDb();
    return ((await db.get('seats', id)) as Seat) ?? null;
  }

  async save(seat: Seat): Promise<void> {
    const db = await getDb();
    await db.put('seats', { ...seat });
  }

  async saveBatch(seats: Seat[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('seats', 'readwrite');
    await Promise.all([...seats.map((s) => tx.store.put({ ...s })), tx.done]);
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('seats', id);
  }

  async deleteByVenue(venueId: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('seats', 'readwrite');
    const index = tx.store.index('by-venue');
    let cursor = await index.openCursor(venueId);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  }
}

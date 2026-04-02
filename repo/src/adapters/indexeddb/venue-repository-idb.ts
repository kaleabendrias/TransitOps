import type { Venue } from '@domain/models/venue';
import type { VenueRepository } from '@domain/ports/venue-repository';
import { getDb } from './db';

export class VenueRepositoryIDB implements VenueRepository {
  async getAll(): Promise<Venue[]> {
    const db = await getDb();
    return (await db.getAll('venues')) as Venue[];
  }

  async getById(id: string): Promise<Venue | null> {
    const db = await getDb();
    return ((await db.get('venues', id)) as Venue) ?? null;
  }

  async save(venue: Venue): Promise<void> {
    const db = await getDb();
    await db.put('venues', { ...venue });
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('venues', id);
  }
}

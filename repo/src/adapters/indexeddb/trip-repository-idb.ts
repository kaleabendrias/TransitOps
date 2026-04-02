import type { Trip } from '@domain/models/trip';
import type { TripRepository } from '@domain/ports/trip-repository';
import { getDb } from './db';

export class TripRepositoryIDB implements TripRepository {
  async getAll(): Promise<Trip[]> {
    const db = await getDb();
    return (await db.getAll('trips')) as Trip[];
  }

  async getById(id: string): Promise<Trip | null> {
    const db = await getDb();
    return ((await db.get('trips', id)) as Trip) ?? null;
  }

  async getByVenue(venueId: string): Promise<Trip[]> {
    const db = await getDb();
    return (await db.getAllFromIndex('trips', 'by-venue', venueId)) as Trip[];
  }

  async save(trip: Trip): Promise<void> {
    const db = await getDb();
    await db.put('trips', { ...trip });
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('trips', id);
  }
}

import type { Hold } from '@domain/models/hold';
import type { HoldRepository } from '@domain/ports/hold-repository';
import { getDb } from './db';

export class HoldRepositoryIDB implements HoldRepository {
  async getById(id: string): Promise<Hold | null> {
    const db = await getDb();
    return ((await db.get('holds', id)) as Hold) ?? null;
  }

  async getByTrip(tripId: string): Promise<Hold[]> {
    const db = await getDb();
    return (await db.getAllFromIndex('holds', 'by-trip', tripId)) as Hold[];
  }

  async getActiveBySeat(seatMapEntryId: string): Promise<Hold | null> {
    const db = await getDb();
    const all = (await db.getAllFromIndex('holds', 'by-seat', seatMapEntryId)) as Hold[];
    return all.find((h) => h.status === 'active') ?? null;
  }

  async getActiveByUser(userId: string): Promise<Hold[]> {
    const db = await getDb();
    const all = (await db.getAllFromIndex('holds', 'by-user', userId)) as Hold[];
    return all.filter((h) => h.status === 'active');
  }

  async save(hold: Hold): Promise<void> {
    const db = await getDb();
    await db.put('holds', { ...hold });
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('holds', id);
  }

  async getAllActive(): Promise<Hold[]> {
    const db = await getDb();
    return ((await db.getAllFromIndex('holds', 'by-status', 'active')) as Hold[]);
  }
}

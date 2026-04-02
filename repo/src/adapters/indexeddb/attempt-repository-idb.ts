import type { Attempt } from '@domain/models/attempt';
import type { AttemptRepository } from '@domain/ports/attempt-repository';
import { getDb } from './db';

export class AttemptRepositoryIDB implements AttemptRepository {
  async getById(id: string): Promise<Attempt | null> {
    const db = await getDb();
    return ((await db.get('attempts', id)) as Attempt) ?? null;
  }

  async getByUser(userId: string): Promise<Attempt[]> {
    const db = await getDb();
    return (await db.getAllFromIndex('attempts', 'by-user', userId)) as Attempt[];
  }

  async getByQuestion(questionId: string): Promise<Attempt[]> {
    const db = await getDb();
    return (await db.getAllFromIndex('attempts', 'by-question', questionId)) as Attempt[];
  }

  async save(attempt: Attempt): Promise<void> {
    const db = await getDb();
    await db.put('attempts', { ...attempt });
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('attempts', id);
  }
}

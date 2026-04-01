import type { Question } from '@domain/models/question';
import type { QuestionRepository } from '@domain/ports/question-repository';
import { getDb } from './db';

export class QuestionRepositoryIDB implements QuestionRepository {
  async getAll(): Promise<Question[]> {
    const db = await getDb();
    return (await db.getAll('questions')) as Question[];
  }

  async getById(id: string): Promise<Question | null> {
    const db = await getDb();
    return ((await db.get('questions', id)) as Question) ?? null;
  }

  async getByCatalog(catalogId: string): Promise<Question[]> {
    const db = await getDb();
    return (await db.getAllFromIndex('questions', 'by-catalog', catalogId)) as Question[];
  }

  async save(question: Question): Promise<void> {
    const db = await getDb();
    await db.put('questions', { ...question });
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('questions', id);
  }
}

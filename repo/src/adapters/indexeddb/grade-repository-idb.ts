import type { Grade } from '@domain/models/grade';
import type { GradeRepository } from '@domain/ports/grade-repository';
import { getDb } from './db';

export class GradeRepositoryIDB implements GradeRepository {
  async getById(id: string): Promise<Grade | null> {
    const db = await getDb();
    return ((await db.get('grades', id)) as Grade) ?? null;
  }

  async getByAttempt(attemptId: string): Promise<Grade | null> {
    const db = await getDb();
    const results = (await db.getAllFromIndex('grades', 'by-attempt', attemptId)) as Grade[];
    return results[0] ?? null;
  }

  async getByReviewer(reviewerId: string): Promise<Grade[]> {
    const db = await getDb();
    return (await db.getAllFromIndex('grades', 'by-reviewer', reviewerId)) as Grade[];
  }

  async getAllRequiringSecondReview(): Promise<Grade[]> {
    const db = await getDb();
    const all = await db.getAll('grades') as Grade[];
    return all.filter((g) => g.requiresSecondReview);
  }

  async save(grade: Grade): Promise<void> {
    const db = await getDb();
    await db.put('grades', { ...grade });
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('grades', id);
  }
}

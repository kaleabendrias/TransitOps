import type { Grade } from '../models/grade';

export interface GradeRepository {
  getById(id: string): Promise<Grade | null>;
  getByAttempt(attemptId: string): Promise<Grade | null>;
  getByReviewer(reviewerId: string): Promise<Grade[]>;
  getAllRequiringSecondReview(): Promise<Grade[]>;
  save(grade: Grade): Promise<void>;
  delete(id: string): Promise<void>;
}

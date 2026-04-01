import type { Attempt } from '../models/attempt';

export interface AttemptRepository {
  getById(id: string): Promise<Attempt | null>;
  getByUser(userId: string): Promise<Attempt[]>;
  getByQuestion(questionId: string): Promise<Attempt[]>;
  save(attempt: Attempt): Promise<void>;
  delete(id: string): Promise<void>;
}

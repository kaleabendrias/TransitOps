import type { Question } from '../models/question';

export interface QuestionRepository {
  getAll(): Promise<Question[]>;
  getById(id: string): Promise<Question | null>;
  getByCatalog(catalogId: string): Promise<Question[]>;
  save(question: Question): Promise<void>;
  delete(id: string): Promise<void>;
}

import type { Question, QuestionType } from '@domain/models/question';
import {
  createQuestion, copyQuestion, deactivateQuestion, reactivateQuestion,
  softDeleteQuestion, restoreQuestion, updateQuestion,
} from '@domain/models/question';
import type { QuestionRepository } from '@domain/ports/question-repository';
import type { ServiceActor } from './service-actor';
import { requirePermission } from './service-actor';

export class QuestionService {
  constructor(private readonly questionRepo: QuestionRepository) {}

  async list(catalogId?: string): Promise<Question[]> {
    if (catalogId) return this.questionRepo.getByCatalog(catalogId);
    return this.questionRepo.getAll();
  }

  async listActive(catalogId?: string): Promise<Question[]> {
    return (await this.list(catalogId)).filter((q) => q.status !== 'deleted');
  }

  async get(id: string): Promise<Question | null> { return this.questionRepo.getById(id); }

  async create(params: {
    catalogId: string; text: string; type: QuestionType; options?: string[];
    correctAnswer: string; explanation?: string; points?: number;
    difficulty?: number; score?: number; tags?: string[];
    knowledgePoints?: string[]; departmentIds?: string[]; createdBy: string;
  }, actor: ServiceActor): Promise<Question> {
    requirePermission(actor, 'manage_questions');
    const q = createQuestion(params);
    await this.questionRepo.save(q);
    return q;
  }

  async edit(id: string, updates: Partial<Pick<
    Question, 'text' | 'type' | 'options' | 'correctAnswer' | 'explanation' |
    'points' | 'difficulty' | 'score' | 'tags' | 'knowledgePoints' | 'departmentIds' | 'catalogId'
  >>, actor: ServiceActor): Promise<Question> {
    requirePermission(actor, 'manage_questions');
    const q = await this.questionRepo.getById(id);
    if (!q) throw new Error(`Question ${id} not found`);
    if (q.status === 'deleted') throw new Error('Cannot edit a deleted question');
    const updated = updateQuestion(q, updates);
    await this.questionRepo.save(updated);
    return updated;
  }

  async copy(id: string, createdBy: string, actor: ServiceActor): Promise<Question> {
    requirePermission(actor, 'manage_questions');
    const q = await this.questionRepo.getById(id);
    if (!q) throw new Error(`Question ${id} not found`);
    const copied = copyQuestion(q, createdBy);
    await this.questionRepo.save(copied);
    return copied;
  }

  async deactivate(id: string, actor: ServiceActor): Promise<Question> {
    requirePermission(actor, 'manage_questions');
    const q = await this.questionRepo.getById(id);
    if (!q) throw new Error(`Question ${id} not found`);
    return this.saveAndReturn(deactivateQuestion(q));
  }

  async reactivate(id: string, actor: ServiceActor): Promise<Question> {
    requirePermission(actor, 'manage_questions');
    const q = await this.questionRepo.getById(id);
    if (!q) throw new Error(`Question ${id} not found`);
    return this.saveAndReturn(reactivateQuestion(q));
  }

  async softDelete(id: string, actor: ServiceActor): Promise<Question> {
    requirePermission(actor, 'manage_questions');
    const q = await this.questionRepo.getById(id);
    if (!q) throw new Error(`Question ${id} not found`);
    return this.saveAndReturn(softDeleteQuestion(q));
  }

  async restore(id: string, actor: ServiceActor): Promise<Question> {
    requirePermission(actor, 'manage_questions');
    const q = await this.questionRepo.getById(id);
    if (!q) throw new Error(`Question ${id} not found`);
    if (q.status !== 'deleted') throw new Error('Question is not deleted');
    return this.saveAndReturn(restoreQuestion(q));
  }

  private async saveAndReturn(q: Question): Promise<Question> {
    await this.questionRepo.save(q);
    return q;
  }
}

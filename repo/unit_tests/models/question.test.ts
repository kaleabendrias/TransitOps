import { describe, it, expect } from 'vitest';
import {
  createQuestion, copyQuestion, deactivateQuestion, reactivateQuestion,
  softDeleteQuestion, restoreQuestion, updateQuestion,
  QUESTION_TYPE_LABELS, DIFFICULTY_LABELS,
} from '@domain/models/question';

describe('Question Model', () => {
  const make = () => createQuestion({
    catalogId: 'c1', text: '2+2?', type: 'multiple_choice', options: ['3','4','5'],
    correctAnswer: '4', explanation: 'Math', points: 5, difficulty: 2, score: 80,
    tags: ['math'], knowledgePoints: ['arith'], departmentIds: ['d1'], createdBy: 'a1',
  });

  it('creates with all fields', () => {
    const q = make();
    expect(q.status).toBe('active');
    expect(q.difficulty).toBe(2);
    expect(q.score).toBe(80);
    expect(q.tags).toEqual(['math']);
    expect(q.knowledgePoints).toEqual(['arith']);
    expect(q.departmentIds).toEqual(['d1']);
    expect(q.explanation).toBe('Math');
    expect(q.copiedFromId).toBeNull();
    expect(q.deletedAt).toBeNull();
  });

  it('clamps difficulty to [1,5]', () => {
    const lo = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: 'A', difficulty: 0, createdBy: 'u' });
    const hi = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: 'A', difficulty: 10, createdBy: 'u' });
    expect(lo.difficulty).toBe(1);
    expect(hi.difficulty).toBe(5);
  });

  it('clamps score to [0,100]', () => {
    const lo = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: 'A', score: -10, createdBy: 'u' });
    const hi = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: 'A', score: 200, createdBy: 'u' });
    expect(lo.score).toBe(0);
    expect(hi.score).toBe(100);
  });

  it('defaults optional fields', () => {
    const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'true_false', correctAnswer: 'T', createdBy: 'u' });
    expect(q.options).toEqual([]);
    expect(q.explanation).toBe('');
    expect(q.points).toBe(1);
    expect(q.difficulty).toBe(3);
    expect(q.score).toBe(0);
    expect(q.tags).toEqual([]);
  });

  it('copyQuestion creates new id with reference', () => {
    const orig = make();
    const copy = copyQuestion(orig, 'a2');
    expect(copy.id).not.toBe(orig.id);
    expect(copy.copiedFromId).toBe(orig.id);
    expect(copy.createdBy).toBe('a2');
    expect(copy.status).toBe('active');
    expect(copy.text).toBe(orig.text);
  });

  it('deactivateQuestion', () => {
    const d = deactivateQuestion(make());
    expect(d.status).toBe('inactive');
  });

  it('reactivateQuestion', () => {
    const r = reactivateQuestion(deactivateQuestion(make()));
    expect(r.status).toBe('active');
  });

  it('softDeleteQuestion sets deletedAt', () => {
    const d = softDeleteQuestion(make());
    expect(d.status).toBe('deleted');
    expect(d.deletedAt).toBeGreaterThan(0);
  });

  it('restoreQuestion clears deletedAt', () => {
    const r = restoreQuestion(softDeleteQuestion(make()));
    expect(r.status).toBe('active');
    expect(r.deletedAt).toBeNull();
  });

  it('updateQuestion merges fields immutably', () => {
    const q = make();
    const u = updateQuestion(q, { text: 'New', difficulty: 5 });
    expect(u.text).toBe('New');
    expect(u.difficulty).toBe(5);
    expect(q.text).toBe('2+2?');
  });

  it('QUESTION_TYPE_LABELS covers all types', () => {
    expect(Object.keys(QUESTION_TYPE_LABELS)).toHaveLength(6);
  });

  it('DIFFICULTY_LABELS covers 1-5', () => {
    for (let i = 1; i <= 5; i++) expect(DIFFICULTY_LABELS[i]).toBeTruthy();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { GradingService } from '@services/grading-service';
import { GradeRepositoryIDB } from '@adapters/indexeddb/grade-repository-idb';
import { AttemptRepositoryIDB } from '@adapters/indexeddb/attempt-repository-idb';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';
import { createQuestion } from '@domain/models/question';
import { createAttempt } from '@domain/models/attempt';

const actor = { userId: 'test', role: 'administrator' as const };

describe('GradingService', () => {
  let svc: GradingService;
  let gradeRepo: GradeRepositoryIDB;
  let attemptRepo: AttemptRepositoryIDB;
  let questionRepo: QuestionRepositoryIDB;

  beforeEach(() => {
    gradeRepo = new GradeRepositoryIDB();
    attemptRepo = new AttemptRepositoryIDB();
    questionRepo = new QuestionRepositoryIDB();
    svc = new GradingService(gradeRepo, attemptRepo, questionRepo);
  });

  it('auto-scores multiple choice correctly', async () => {
    const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'B', points: 5, createdBy: 'u' });
    await questionRepo.save(q);
    const a = createAttempt({ questionId: q.id, userId: 'u1' });
    await attemptRepo.save(a);

    const { attempt, grade } = await svc.submitAndAutoScore(a.id, 'B', actor);
    expect(attempt.status).toBe('submitted');
    expect(grade).not.toBeNull();
    expect(grade!.score).toBe(5);
    expect(grade!.isAutoScored).toBe(true);
    expect(grade!.feedback).toContain('Correct');
  });

  it('auto-scores wrong answer to 0', async () => {
    const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'B', points: 5, createdBy: 'u' });
    await questionRepo.save(q);
    const a = createAttempt({ questionId: q.id, userId: 'u1' });
    await attemptRepo.save(a);

    const { grade } = await svc.submitAndAutoScore(a.id, 'A', actor);
    expect(grade!.score).toBe(0);
    expect(grade!.feedback).toContain('Incorrect');
  });

  it('does not auto-score essay', async () => {
    const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', points: 10, createdBy: 'u' });
    await questionRepo.save(q);
    const a = createAttempt({ questionId: q.id, userId: 'u1' });
    await attemptRepo.save(a);

    const { grade } = await svc.submitAndAutoScore(a.id, 'My essay', actor);
    expect(grade).toBeNull();
  });

  it('manual grade with 0.5 rounding', async () => {
    const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', points: 10, createdBy: 'u' });
    await questionRepo.save(q);
    const a = createAttempt({ questionId: q.id, userId: 'u1' });
    await attemptRepo.save(a);

    const grade = await svc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 7.3, maxScore: 10, feedback: 'good' }, actor);
    expect(grade.score).toBe(7.5); // rounded to 0.5
  });

  it('flags for second review when score changes > 10', async () => {
    const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'short_answer', correctAnswer: 'A', points: 20, createdBy: 'u' });
    await questionRepo.save(q);
    const a = createAttempt({ questionId: q.id, userId: 'u1' });
    await attemptRepo.save(a);

    await svc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 5, maxScore: 20, feedback: 'low' }, actor);
    const updated = await svc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 18, maxScore: 20, feedback: 'high' }, actor);
    expect(updated.requiresSecondReview).toBe(true);
  });

  it('second review averages scores', async () => {
    const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'short_answer', correctAnswer: 'A', points: 20, createdBy: 'u' });
    await questionRepo.save(q);
    const a = createAttempt({ questionId: q.id, userId: 'u1' });
    await attemptRepo.save(a);

    await svc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 5, maxScore: 20, feedback: 'low' }, actor);
    const flagged = await svc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 18, maxScore: 20, feedback: 'high' }, actor);

    const reviewed = await svc.submitSecondReview(flagged.id, 'r2', 14, 'moderate', actor);
    expect(reviewed.secondReviewerId).toBe('r2');
    expect(reviewed.secondReviewScore).toBe(14);
    expect(reviewed.finalScore).toBe((18 + 14) / 2);
    expect(reviewed.requiresSecondReview).toBe(false);
  });

  it('rejects second review on non-flagged grade', async () => {
    const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', points: 10, createdBy: 'u' });
    await questionRepo.save(q);
    const a = createAttempt({ questionId: q.id, userId: 'u1' });
    await attemptRepo.save(a);

    const grade = await svc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 8, maxScore: 10, feedback: 'ok' }, actor);
    await expect(svc.submitSecondReview(grade.id, 'r2', 7, 'lower', actor)).rejects.toThrow('does not require');
  });

  it('computeOverallScore computes weighted average', async () => {
    const q1 = createQuestion({ catalogId: 'c', text: 'Q1', type: 'multiple_choice', correctAnswer: 'A', points: 10, createdBy: 'u' });
    const q2 = createQuestion({ catalogId: 'c', text: 'Q2', type: 'essay', correctAnswer: '-', points: 10, createdBy: 'u' });
    await questionRepo.save(q1);
    await questionRepo.save(q2);

    const a1 = createAttempt({ questionId: q1.id, userId: 'u1' });
    const a2 = createAttempt({ questionId: q2.id, userId: 'u1' });
    await attemptRepo.save(a1);
    await attemptRepo.save(a2);

    await svc.submitAndAutoScore(a1.id, 'A', actor);
    await svc.manualGrade({ attemptId: a2.id, reviewerId: 'r1', score: 5, maxScore: 10, feedback: 'ok' }, actor);

    const overall = await svc.computeOverallScore([a1.id, a2.id]);
    expect(overall).toBeGreaterThan(0);
    expect(overall).toBeLessThanOrEqual(100);
  });

  it('rejects invalid attempt/question', async () => {
    await expect(svc.submitAndAutoScore('bogus', 'A', actor)).rejects.toThrow('not found');
    await expect(svc.manualGrade({ attemptId: 'bogus', reviewerId: 'r', score: 5, maxScore: 10, feedback: '' }, actor)).rejects.toThrow('not found');
    await expect(svc.submitSecondReview('bogus', 'r', 5, '', actor)).rejects.toThrow('not found');
  });
});

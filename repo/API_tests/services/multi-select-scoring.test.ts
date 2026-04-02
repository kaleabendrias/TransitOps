import { describe, it, expect, beforeEach } from 'vitest';
import { autoScore, isAutoScorable } from '@domain/policies/grading-policy';
import { createQuestion } from '@domain/models/question';
import { createAttempt } from '@domain/models/attempt';
import { GradingService } from '@services/grading-service';
import { GradeRepositoryIDB } from '@adapters/indexeddb/grade-repository-idb';
import { AttemptRepositoryIDB } from '@adapters/indexeddb/attempt-repository-idb';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';

const actor = { userId: 'test', role: 'administrator' as const };

describe('Multi-select multiple_choice scoring', () => {
  describe('policy-level autoScore', () => {
    it('scores single correct answer full points', () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'B', points: 5, createdBy: 'u' });
      expect(autoScore(q, 'B')).toBe(5);
    });

    it('scores multi-select correct answer full points', () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'A,C', points: 5, createdBy: 'u' });
      expect(autoScore(q, 'A,C')).toBe(5);
    });

    it('scores multi-select in different order full points (sorted comparison)', () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'C,A', points: 5, createdBy: 'u' });
      expect(autoScore(q, 'A,C')).toBe(5);
    });

    it('scores multi-select with extra spaces and case differences full points', () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'A , C', points: 5, createdBy: 'u' });
      expect(autoScore(q, 'a,c')).toBe(5);
    });

    it('scores multi-select missing one choice as 0', () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'A,B,C', points: 5, createdBy: 'u' });
      expect(autoScore(q, 'A,C')).toBe(0);
    });

    it('scores multi-select with extra choice as 0', () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'A,C', points: 5, createdBy: 'u' });
      expect(autoScore(q, 'A,B,C')).toBe(0);
    });

    it('scores multi-select all wrong as 0', () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'A,C', points: 5, createdBy: 'u' });
      expect(autoScore(q, 'B,D')).toBe(0);
    });

    it('scores empty answer for multi-select as 0', () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'A,B', points: 5, createdBy: 'u' });
      expect(autoScore(q, '')).toBe(0);
    });

    it('deduplicates answer entries and scores full points', () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'A,B', points: 5, createdBy: 'u' });
      expect(autoScore(q, 'A,A,B')).toBe(5);
    });

    it('scores single_choice with simple comparison', () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'single_choice', correctAnswer: 'B', points: 5, createdBy: 'u' });
      expect(autoScore(q, 'B')).toBe(5);
    });

    it('scores true_false without multi-select logic', () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'true_false', correctAnswer: 'true', points: 5, createdBy: 'u' });
      expect(autoScore(q, 'true')).toBe(5);
    });
  });

  describe('service-level integration', () => {
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

    it('end-to-end: multi-select correct in different order scores full points', async () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'A,C', points: 10, createdBy: 'u' });
      await questionRepo.save(q);
      const a = createAttempt({ questionId: q.id, userId: 'u1' });
      await attemptRepo.save(a);

      const { attempt, grade } = await svc.submitAndAutoScore(a.id, 'C,A', actor);
      expect(attempt.status).toBe('submitted');
      expect(grade).not.toBeNull();
      expect(grade!.score).toBe(10);
      expect(grade!.isAutoScored).toBe(true);
      expect(grade!.feedback).toContain('Correct');
    });

    it('end-to-end: multi-select partial answer scores 0', async () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'A,C', points: 10, createdBy: 'u' });
      await questionRepo.save(q);
      const a = createAttempt({ questionId: q.id, userId: 'u1' });
      await attemptRepo.save(a);

      const { grade } = await svc.submitAndAutoScore(a.id, 'A', actor);
      expect(grade).not.toBeNull();
      expect(grade!.score).toBe(0);
      expect(grade!.feedback).toContain('Incorrect');
    });
  });
});

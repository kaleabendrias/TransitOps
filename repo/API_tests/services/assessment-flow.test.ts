import { describe, it, expect, beforeEach } from 'vitest';
import { GradingService } from '@services/grading-service';
import { GradeRepositoryIDB } from '@adapters/indexeddb/grade-repository-idb';
import { AttemptRepositoryIDB } from '@adapters/indexeddb/attempt-repository-idb';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';
import { createQuestion } from '@domain/models/question';
import { createAttempt } from '@domain/models/attempt';
import { canAccessRoute } from '@domain/policies/auth-policy';

const actor = { userId: 'test', role: 'administrator' as const };

describe('Assessment submission + auto-grading flow', () => {
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

  it('full flow: create attempt -> submitAndAutoScore for multiple_choice -> grade returned', async () => {
    const q = createQuestion({ catalogId: 'c1', text: 'Pick one', type: 'multiple_choice', correctAnswer: 'C', points: 10, createdBy: 'u1' });
    await questionRepo.save(q);
    const a = createAttempt({ questionId: q.id, userId: 'student1' });
    await attemptRepo.save(a);

    const { attempt, grade } = await svc.submitAndAutoScore(a.id, 'C', actor);
    expect(attempt.status).toBe('submitted');
    expect(attempt.answer).toBe('C');
    expect(grade).not.toBeNull();
    expect(grade!.score).toBe(10);
    expect(grade!.isAutoScored).toBe(true);
    expect(grade!.feedback).toContain('Correct');
  });

  it('full flow: essay -> submitAndAutoScore returns null grade -> manualGrade provides score', async () => {
    const q = createQuestion({ catalogId: 'c1', text: 'Write an essay', type: 'essay', correctAnswer: '-', points: 20, createdBy: 'u1' });
    await questionRepo.save(q);
    const a = createAttempt({ questionId: q.id, userId: 'student1' });
    await attemptRepo.save(a);

    const { grade: autoGrade } = await svc.submitAndAutoScore(a.id, 'My detailed essay response', actor);
    expect(autoGrade).toBeNull();

    const manualResult = await svc.manualGrade({
      attemptId: a.id,
      reviewerId: 'reviewer1',
      score: 15,
      maxScore: 20,
      feedback: 'Well written',
    }, actor);
    expect(manualResult.score).toBe(15);
    expect(manualResult.feedback).toBe('Well written');
  });

  it('auto-scored true_false question returns correct/incorrect', async () => {
    const q = createQuestion({ catalogId: 'c1', text: 'The sky is blue', type: 'true_false', correctAnswer: 'true', points: 5, createdBy: 'u1' });
    await questionRepo.save(q);

    const correct = createAttempt({ questionId: q.id, userId: 'student1' });
    await attemptRepo.save(correct);
    const { grade: gradeCorrect } = await svc.submitAndAutoScore(correct.id, 'true', actor);
    expect(gradeCorrect).not.toBeNull();
    expect(gradeCorrect!.score).toBe(5);
    expect(gradeCorrect!.feedback).toContain('Correct');

    const wrong = createAttempt({ questionId: q.id, userId: 'student2' });
    await attemptRepo.save(wrong);
    const { grade: gradeWrong } = await svc.submitAndAutoScore(wrong.id, 'false', actor);
    expect(gradeWrong).not.toBeNull();
    expect(gradeWrong!.score).toBe(0);
    expect(gradeWrong!.feedback).toContain('Incorrect');
  });

  it('fill-in-the-blank auto-scoring', async () => {
    const q = createQuestion({ catalogId: 'c1', text: 'The capital of France is ___', type: 'fill_in_the_blank', correctAnswer: 'Paris', points: 5, createdBy: 'u1' });
    await questionRepo.save(q);

    const a = createAttempt({ questionId: q.id, userId: 'student1' });
    await attemptRepo.save(a);
    const { grade } = await svc.submitAndAutoScore(a.id, 'Paris', actor);
    expect(grade).not.toBeNull();
    expect(grade!.score).toBe(5);
    expect(grade!.isAutoScored).toBe(true);
  });

  it('attempt is marked as graded status after auto-score', async () => {
    const q = createQuestion({ catalogId: 'c1', text: 'Q', type: 'multiple_choice', correctAnswer: 'A', points: 5, createdBy: 'u1' });
    await questionRepo.save(q);
    const a = createAttempt({ questionId: q.id, userId: 'student1' });
    await attemptRepo.save(a);

    await svc.submitAndAutoScore(a.id, 'A', actor);

    const saved = await attemptRepo.getById(a.id);
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe('graded');
  });

  it('attempt is marked as graded status after manual grade', async () => {
    const q = createQuestion({ catalogId: 'c1', text: 'Q', type: 'essay', correctAnswer: '-', points: 10, createdBy: 'u1' });
    await questionRepo.save(q);
    const a = createAttempt({ questionId: q.id, userId: 'student1' });
    await attemptRepo.save(a);

    await svc.submitAndAutoScore(a.id, 'My answer', actor);
    await svc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 8, maxScore: 10, feedback: 'Good' }, actor);

    const saved = await attemptRepo.getById(a.id);
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe('graded');
  });

  it('assessment route access: dispatcher can access /assess/x', () => {
    expect(canAccessRoute('dispatcher', '/assess/x')).toBe(true);
  });

  it('grade route access: reviewer can access /grade/x', () => {
    expect(canAccessRoute('reviewer', '/grade/x')).toBe(true);
  });

  it('grade route access: dispatcher cannot access /grade/x', () => {
    expect(canAccessRoute('dispatcher', '/grade/x')).toBe(false);
  });

  describe('GradingService.createAttempt and getAttempt', () => {
    it('createAttempt creates and persists an attempt via the service layer', async () => {
      const q = createQuestion({ catalogId: 'c1', text: 'Q', type: 'essay', correctAnswer: '-', points: 5, createdBy: 'u1' });
      await questionRepo.save(q);

      const attempt = await svc.createAttempt(q.id, 'student1', actor);
      expect(attempt.id).toBeTruthy();
      expect(attempt.questionId).toBe(q.id);
      expect(attempt.userId).toBe('student1');
      expect(attempt.status).toBe('in_progress');
    });

    it('createAttempt throws for nonexistent question', async () => {
      await expect(svc.createAttempt('nonexistent', 'u1', actor)).rejects.toThrow('not found');
    });

    it('getAttempt retrieves an attempt by ID', async () => {
      const q = createQuestion({ catalogId: 'c1', text: 'Q', type: 'essay', correctAnswer: '-', points: 5, createdBy: 'u1' });
      await questionRepo.save(q);
      const created = await svc.createAttempt(q.id, 'student1', actor);

      const fetched = await svc.getAttempt(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(created.id);
      expect(fetched!.questionId).toBe(q.id);
    });

    it('getAttempt returns null for nonexistent ID', async () => {
      const result = await svc.getAttempt('nonexistent');
      expect(result).toBeNull();
    });

    it('createAttempt + submitAndAutoScore full service-only flow', async () => {
      const q = createQuestion({ catalogId: 'c1', text: 'Q', type: 'multiple_choice', correctAnswer: 'A', points: 10, createdBy: 'u1' });
      await questionRepo.save(q);

      const attempt = await svc.createAttempt(q.id, 'student1', actor);
      const { grade } = await svc.submitAndAutoScore(attempt.id, 'A', actor);
      expect(grade).not.toBeNull();
      expect(grade!.score).toBe(10);

      const updated = await svc.getAttempt(attempt.id);
      expect(updated!.status).toBe('graded');
    });
  });
});

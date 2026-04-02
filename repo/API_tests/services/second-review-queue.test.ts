import { describe, it, expect, beforeEach } from 'vitest';
import { GradingService } from '@services/grading-service';
import { GradeRepositoryIDB } from '@adapters/indexeddb/grade-repository-idb';
import { AttemptRepositoryIDB } from '@adapters/indexeddb/attempt-repository-idb';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';
import { createQuestion } from '@domain/models/question';
import { createAttempt } from '@domain/models/attempt';

describe('Second-review queue visibility', () => {
  let svc: GradingService;
  let questionRepo: QuestionRepositoryIDB;
  let attemptRepo: AttemptRepositoryIDB;

  beforeEach(() => {
    questionRepo = new QuestionRepositoryIDB();
    attemptRepo = new AttemptRepositoryIDB();
    svc = new GradingService(new GradeRepositoryIDB(), attemptRepo, questionRepo);
  });

  async function createGradedAttempt(reviewerId: string, firstScore: number, secondScore: number, maxScore: number) {
    const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'short_answer', correctAnswer: 'A', points: maxScore, createdBy: 'u' });
    await questionRepo.save(q);
    const a = createAttempt({ questionId: q.id, userId: 'student1' });
    await attemptRepo.save(a);

    // First grade
    await svc.manualGrade({ attemptId: a.id, reviewerId, score: firstScore, maxScore, feedback: 'initial' });
    // Second grade with large change to trigger second-review flag
    return svc.manualGrade({ attemptId: a.id, reviewerId, score: secondScore, maxScore, feedback: 'revised' });
  }

  it('getGradesRequiringSecondReview returns ALL flagged grades, not just one reviewer', async () => {
    // Reviewer A flags a grade
    await createGradedAttempt('reviewerA', 3, 18, 20);
    // Reviewer B flags a different grade
    await createGradedAttempt('reviewerB', 2, 17, 20);

    const queue = await svc.getGradesRequiringSecondReview();
    expect(queue.length).toBe(2);
    const reviewerIds = queue.map(g => g.reviewerId);
    expect(reviewerIds).toContain('reviewerA');
    expect(reviewerIds).toContain('reviewerB');
  });

  it('completed second reviews are excluded from the queue', async () => {
    const flagged = await createGradedAttempt('r1', 5, 19, 20);
    expect(flagged.requiresSecondReview).toBe(true);

    await svc.submitSecondReview(flagged.id, 'r2', 15, 'Looks ok');

    const queue = await svc.getGradesRequiringSecondReview();
    expect(queue.length).toBe(0);
  });

  it('grades without large score changes are not in the queue', async () => {
    const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', points: 10, createdBy: 'u' });
    await questionRepo.save(q);
    const a = createAttempt({ questionId: q.id, userId: 'student2' });
    await attemptRepo.save(a);

    // Small score change (within threshold)
    await svc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 7, maxScore: 10, feedback: 'ok' });
    await svc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 8, maxScore: 10, feedback: 'revised' });

    const queue = await svc.getGradesRequiringSecondReview();
    expect(queue.length).toBe(0);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { GradingService } from '@services/grading-service';
import { GradeRepositoryIDB } from '@adapters/indexeddb/grade-repository-idb';
import { AttemptRepositoryIDB } from '@adapters/indexeddb/attempt-repository-idb';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';
import { CryptoStorageService } from '@services/crypto-storage-service';
import { createQuestion } from '@domain/models/question';
import { createAttempt } from '@domain/models/attempt';

const actor = { userId: 'test', role: 'administrator' as const };

describe('GradingService decrypted grade reads', () => {
  let svc: GradingService;
  let gradeRepo: GradeRepositoryIDB;
  let attemptRepo: AttemptRepositoryIDB;
  let questionRepo: QuestionRepositoryIDB;
  let cryptoStore: CryptoStorageService;

  beforeEach(() => {
    gradeRepo = new GradeRepositoryIDB();
    attemptRepo = new AttemptRepositoryIDB();
    questionRepo = new QuestionRepositoryIDB();
    cryptoStore = new CryptoStorageService();
    cryptoStore.setKeyMaterial('test-key-material');
    svc = new GradingService(gradeRepo, attemptRepo, questionRepo, cryptoStore);
  });

  async function createEssaySetup(reviewerId = 'r1', feedback = 'Great essay work', comments = 'Solid analysis') {
    const q = createQuestion({ catalogId: 'c', text: 'Write an essay', type: 'essay', correctAnswer: '-', points: 10, createdBy: 'u' });
    await questionRepo.save(q);
    const a = createAttempt({ questionId: q.id, userId: 'u1' });
    await attemptRepo.save(a);
    const grade = await svc.manualGrade({ attemptId: a.id, reviewerId, score: 8, maxScore: 10, feedback, comments }, actor);
    return { question: q, attempt: a, grade };
  }

  it('stores encrypted sentinel values in the raw grade repository', async () => {
    const { grade } = await createEssaySetup();
    const raw = await gradeRepo.getById(grade.id);
    expect(raw).not.toBeNull();
    expect(raw!.feedback).toBe('[encrypted]');
    expect(raw!.comments).toBe('[encrypted]');
  });

  it('getDecryptedGrade returns decrypted feedback and comments', async () => {
    const { grade } = await createEssaySetup('r1', 'Great essay work', 'Solid analysis');
    const decrypted = await svc.getDecryptedGrade(grade.id);
    expect(decrypted).not.toBeNull();
    expect(decrypted!.feedback).toBe('Great essay work');
    expect(decrypted!.comments).toBe('Solid analysis');
    expect(decrypted!.score).toBe(8);
  });

  it('getDecryptedGradeByAttempt returns decrypted grade', async () => {
    const { attempt } = await createEssaySetup('r1', 'Attempt feedback', 'Attempt comments');
    const decrypted = await svc.getDecryptedGradeByAttempt(attempt.id);
    expect(decrypted).not.toBeNull();
    expect(decrypted!.feedback).toBe('Attempt feedback');
    expect(decrypted!.comments).toBe('Attempt comments');
  });

  it('getDecryptedGrades returns all decrypted grades for a reviewer', async () => {
    await createEssaySetup('reviewer-A', 'Feedback one', 'Comment one');
    await createEssaySetup('reviewer-A', 'Feedback two', 'Comment two');
    await createEssaySetup('reviewer-B', 'Other feedback', 'Other comment');

    const grades = await svc.getDecryptedGrades('reviewer-A');
    expect(grades).toHaveLength(2);
    const feedbacks = grades.map((g) => g.feedback).sort();
    expect(feedbacks).toEqual(['Feedback one', 'Feedback two']);
    const comments = grades.map((g) => g.comments).sort();
    expect(comments).toEqual(['Comment one', 'Comment two']);
  });

  it('getDecryptedSecondReviewQueue returns decrypted grades requiring second review', async () => {
    const q = createQuestion({ catalogId: 'c', text: 'Essay', type: 'essay', correctAnswer: '-', points: 20, createdBy: 'u' });
    await questionRepo.save(q);
    const a = createAttempt({ questionId: q.id, userId: 'u1' });
    await attemptRepo.save(a);

    await svc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 5, maxScore: 20, feedback: 'low score' }, actor);
    const flagged = await svc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 18, maxScore: 20, feedback: 'high score' }, actor);
    expect(flagged.requiresSecondReview).toBe(true);

    const queue = await svc.getDecryptedSecondReviewQueue();
    expect(queue.length).toBeGreaterThanOrEqual(1);
    const match = queue.find((g) => g.id === flagged.id);
    expect(match).toBeDefined();
    expect(match!.feedback).toBe('high score');
  });

  it('returns encrypted sentinels as-is when key material is not set', async () => {
    const { grade } = await createEssaySetup('r1', 'Secret feedback', 'Secret comments');

    cryptoStore.clearKeyMaterial();

    const decrypted = await svc.getDecryptedGrade(grade.id);
    expect(decrypted).not.toBeNull();
    expect(decrypted!.feedback).toBe('[encrypted]');
    expect(decrypted!.comments).toBe('[encrypted]');
  });

  it('getDecryptedGrade returns null for non-existent grade', async () => {
    const result = await svc.getDecryptedGrade('non-existent-id');
    expect(result).toBeNull();
  });
});

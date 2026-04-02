import { describe, it, expect, beforeEach } from 'vitest';
import { NutritionService } from '@services/nutrition-service';
import { GradingService } from '@services/grading-service';
import { CryptoStorageService } from '@services/crypto-storage-service';
import { NutritionProfileRepositoryIDB, MealSuggestionRepositoryIDB } from '@adapters/indexeddb/nutrition-repository-idb';
import { GradeRepositoryIDB } from '@adapters/indexeddb/grade-repository-idb';
import { AttemptRepositoryIDB } from '@adapters/indexeddb/attempt-repository-idb';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';
import { createQuestion } from '@domain/models/question';
import { createAttempt } from '@domain/models/attempt';

const actor = { userId: 'test', role: 'administrator' as const };

describe('No sensitive plaintext in canonical IDB records', () => {
  describe('Nutrition profile', () => {
    let svc: NutritionService;
    let profileRepo: NutritionProfileRepositoryIDB;
    let crypto: CryptoStorageService;

    beforeEach(() => {
      profileRepo = new NutritionProfileRepositoryIDB();
      crypto = new CryptoStorageService();
      crypto.setKeyMaterial('test-nutrition-key');
      svc = new NutritionService(profileRepo, new MealSuggestionRepositoryIDB(), crypto);
    });

    it('canonical record has redacted allergens/restrictions after save', async () => {
      await svc.saveProfile({ userId: 'u1', allergens: ['dairy', 'nuts'], restrictions: ['vegetarian'] });

      // Read directly from repo (bypassing service decryption)
      const raw = await profileRepo.getByUser('u1');
      expect(raw).not.toBeNull();
      expect(raw!.allergens).toEqual(['[encrypted]']);
      expect(raw!.restrictions).toEqual(['[encrypted]']);
    });

    it('service getProfile decrypts and returns real values', async () => {
      await svc.saveProfile({ userId: 'u2', allergens: ['gluten'], restrictions: ['vegan'] });
      const profile = await svc.getProfile('u2');
      expect(profile!.allergens).toEqual(['gluten']);
      expect(profile!.restrictions).toEqual(['vegan']);
    });

    it('legacy migration: plaintext record gets encrypted on first read', async () => {
      // Simulate legacy record by writing directly to repo with plaintext
      const { createNutritionProfile } = await import('@domain/models/nutrition');
      const legacy = createNutritionProfile({ userId: 'legacy_user', allergens: ['soy'], restrictions: ['keto'] });
      await profileRepo.save(legacy);

      // First getProfile triggers migration
      const result = await svc.getProfile('legacy_user');
      expect(result!.allergens).toEqual(['soy']);

      // Now raw record should be scrubbed
      const raw = await profileRepo.getByUser('legacy_user');
      expect(raw!.allergens).toEqual(['[encrypted]']);
    });

    it('encrypted payload verifies fingerprint', async () => {
      const profile = await svc.saveProfile({ userId: 'u3', allergens: ['eggs'] });
      const valid = await crypto.verifyFingerprint(`nutrition:${profile.id}`);
      expect(valid).toBe(true);
    });
  });

  describe('Grade feedback/comments', () => {
    let svc: GradingService;
    let gradeRepo: GradeRepositoryIDB;
    let crypto: CryptoStorageService;

    beforeEach(() => {
      gradeRepo = new GradeRepositoryIDB();
      crypto = new CryptoStorageService();
      crypto.setKeyMaterial('test-grader-key');
      svc = new GradingService(gradeRepo, new AttemptRepositoryIDB(), new QuestionRepositoryIDB(), crypto);
    });

    it('canonical grade record has scrubbed feedback/comments after manual grade', async () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', points: 10, createdBy: 'u' });
      await new QuestionRepositoryIDB().save(q);
      const a = createAttempt({ questionId: q.id, userId: 'u1' });
      await new AttemptRepositoryIDB().save(a);

      const grade = await svc.manualGrade({
        attemptId: a.id, reviewerId: 'r1', score: 8, maxScore: 10,
        feedback: 'Excellent analysis', comments: 'Private note: check plagiarism',
      }, actor);

      // Read directly from repo
      const raw = await gradeRepo.getById(grade.id);
      expect(raw).not.toBeNull();
      expect(raw!.feedback).toBe('[encrypted]');
      expect(raw!.comments).toBe('[encrypted]');
    });

    it('encrypted payload contains original feedback', async () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', points: 10, createdBy: 'u' });
      await new QuestionRepositoryIDB().save(q);
      const a = createAttempt({ questionId: q.id, userId: 'u1' });
      await new AttemptRepositoryIDB().save(a);

      const grade = await svc.manualGrade({
        attemptId: a.id, reviewerId: 'r1', score: 7, maxScore: 10,
        feedback: 'Needs more depth', comments: 'Grading note',
      }, actor);

      const decrypted = await crypto.decrypt(`grade:${grade.id}`);
      expect(decrypted).not.toBeNull();
      const parsed = JSON.parse(decrypted!);
      expect(parsed.feedback).toBe('Needs more depth');
      expect(parsed.comments).toBe('Grading note');
    });

    it('auto-scored grade also scrubs feedback from canonical record', async () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'B', points: 5, createdBy: 'u' });
      await new QuestionRepositoryIDB().save(q);
      const a = createAttempt({ questionId: q.id, userId: 'u1' });
      await new AttemptRepositoryIDB().save(a);

      const { grade } = await svc.submitAndAutoScore(a.id, 'B', actor);
      expect(grade).not.toBeNull();

      const raw = await gradeRepo.getById(grade!.id);
      expect(raw!.feedback).toBe('[encrypted]');
    });
  });
});

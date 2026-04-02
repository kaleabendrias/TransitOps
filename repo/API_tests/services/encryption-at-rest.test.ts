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

describe('Encryption at rest - nutrition health data', () => {
  let nutritionSvc: NutritionService;
  let crypto: CryptoStorageService;

  beforeEach(() => {
    crypto = new CryptoStorageService();
    crypto.setKeyMaterial('test-user-key');
    nutritionSvc = new NutritionService(
      new NutritionProfileRepositoryIDB(),
      new MealSuggestionRepositoryIDB(),
      crypto
    );
  });

  it('encrypts allergens and restrictions on save', async () => {
    const profile = await nutritionSvc.saveProfile({
      userId: 'u1', allergens: ['dairy', 'nuts'], restrictions: ['vegetarian'],
    });

    // Verify encrypted data exists in crypto store
    const encrypted = await crypto.decrypt(`nutrition:${profile.id}`);
    expect(encrypted).not.toBeNull();
    const parsed = JSON.parse(encrypted!);
    expect(parsed.allergens).toEqual(['dairy', 'nuts']);
    expect(parsed.restrictions).toEqual(['vegetarian']);
  });

  it('decrypts allergens/restrictions on read', async () => {
    await nutritionSvc.saveProfile({
      userId: 'u2', allergens: ['gluten'], restrictions: ['vegan'],
    });

    const profile = await nutritionSvc.getProfile('u2');
    expect(profile).not.toBeNull();
    expect(profile!.allergens).toEqual(['gluten']);
    expect(profile!.restrictions).toEqual(['vegan']);
  });

  it('fingerprint verifies encrypted data integrity', async () => {
    const profile = await nutritionSvc.saveProfile({
      userId: 'u3', allergens: ['soy'],
    });
    const valid = await crypto.verifyFingerprint(`nutrition:${profile.id}`);
    expect(valid).toBe(true);
  });
});

describe('Encryption at rest - grade comments', () => {
  let gradingSvc: GradingService;
  let crypto: CryptoStorageService;

  beforeEach(() => {
    crypto = new CryptoStorageService();
    crypto.setKeyMaterial('test-grader-key');
    gradingSvc = new GradingService(
      new GradeRepositoryIDB(),
      new AttemptRepositoryIDB(),
      new QuestionRepositoryIDB(),
      crypto
    );
  });

  it('encrypts feedback and comments on manual grade', async () => {
    const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', points: 10, createdBy: 'u' });
    await new QuestionRepositoryIDB().save(q);
    const a = createAttempt({ questionId: q.id, userId: 'u1' });
    await new AttemptRepositoryIDB().save(a);

    const grade = await gradingSvc.manualGrade({
      attemptId: a.id, reviewerId: 'r1', score: 7.5, maxScore: 10,
      feedback: 'Good analysis', comments: 'Minor grammar issues',
    }, actor);

    const encrypted = await crypto.decrypt(`grade:${grade.id}`);
    expect(encrypted).not.toBeNull();
    const parsed = JSON.parse(encrypted!);
    expect(parsed.feedback).toBe('Good analysis');
    expect(parsed.comments).toBe('Minor grammar issues');
  });

  it('encrypts auto-scored grade feedback', async () => {
    const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'B', points: 5, createdBy: 'u' });
    await new QuestionRepositoryIDB().save(q);
    const a = createAttempt({ questionId: q.id, userId: 'u1' });
    await new AttemptRepositoryIDB().save(a);

    const { grade } = await gradingSvc.submitAndAutoScore(a.id, 'B', actor);
    expect(grade).not.toBeNull();

    const encrypted = await crypto.decrypt(`grade:${grade!.id}`);
    expect(encrypted).not.toBeNull();
    const parsed = JSON.parse(encrypted!);
    expect(parsed.feedback).toContain('Correct');
  });
});

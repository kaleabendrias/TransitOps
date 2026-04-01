import { describe, it, expect, beforeEach } from 'vitest';
import { ExportImportService } from '@services/export-import-service';
import { NutritionService } from '@services/nutrition-service';
import { GradingService } from '@services/grading-service';
import { CryptoStorageService } from '@services/crypto-storage-service';
import { NutritionProfileRepositoryIDB, MealSuggestionRepositoryIDB } from '@adapters/indexeddb/nutrition-repository-idb';
import { GradeRepositoryIDB } from '@adapters/indexeddb/grade-repository-idb';
import { AttemptRepositoryIDB } from '@adapters/indexeddb/attempt-repository-idb';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';
import { EncryptedStoreIDB } from '@adapters/indexeddb/encrypted-store-idb';
import { createQuestion } from '@domain/models/question';
import { createAttempt } from '@domain/models/attempt';
import type { ExportBundle } from '@services/export-import-service';

describe('Export/import includes encryptedStore for sensitive-data round-trip', () => {
  let exportSvc: ExportImportService;
  let nutritionSvc: NutritionService;
  let gradingSvc: GradingService;
  let crypto: CryptoStorageService;

  beforeEach(() => {
    exportSvc = new ExportImportService();
    crypto = new CryptoStorageService();
    crypto.setKeyMaterial('test-key');
    nutritionSvc = new NutritionService(
      new NutritionProfileRepositoryIDB(),
      new MealSuggestionRepositoryIDB(),
      crypto
    );
    gradingSvc = new GradingService(
      new GradeRepositoryIDB(),
      new AttemptRepositoryIDB(),
      new QuestionRepositoryIDB(),
      crypto
    );
  });

  it('export manifest includes encryptedStore', async () => {
    const blob = await exportSvc.exportToJson();
    const bundle: ExportBundle = JSON.parse(await blob.text());
    expect(bundle.manifest.stores).toContain('encryptedStore');
  });

  it('nutrition encrypted data survives export→import round-trip', async () => {
    // Save profile with sensitive allergens
    const profile = await nutritionSvc.saveProfile({
      userId: 'u1', allergens: ['dairy', 'nuts'], restrictions: ['vegetarian'],
    });

    // Export
    const blob = await exportSvc.exportToJson();
    const bundle: ExportBundle = JSON.parse(await blob.text());

    // Verify encryptedStore has data
    expect(bundle.data.encryptedStore.length).toBeGreaterThan(0);
    expect(bundle.data.nutritionProfiles.length).toBe(1);

    // Verify canonical record has redacted fields
    const rawProfile = bundle.data.nutritionProfiles[0] as Record<string, unknown>;
    expect(rawProfile.allergens).toEqual(['[encrypted]']);

    // Re-import into same DB (simulates restore)
    const file = new File([JSON.stringify(bundle)], 'export.json', { type: 'application/json' });
    // Need to recompute fingerprint since we parsed and re-stringified
    const dataJson = JSON.stringify(bundle.data);
    const encoder = new TextEncoder();
    const hashBuf = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(dataJson));
    bundle.manifest.fingerprint = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    const fixedFile = new File([JSON.stringify(bundle)], 'export.json', { type: 'application/json' });

    const result = await exportSvc.importFromJson(fixedFile);
    expect(result.imported).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);

    // After import, encrypted data should still decrypt
    const decrypted = await crypto.decrypt(`nutrition:${profile.id}`);
    expect(decrypted).not.toBeNull();
    const parsed = JSON.parse(decrypted!);
    expect(parsed.allergens).toEqual(['dairy', 'nuts']);
  });

  it('grade encrypted feedback survives export→import round-trip', async () => {
    const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', points: 10, createdBy: 'u' });
    await new QuestionRepositoryIDB().save(q);
    const a = createAttempt({ questionId: q.id, userId: 'u1' });
    await new AttemptRepositoryIDB().save(a);

    const grade = await gradingSvc.manualGrade({
      attemptId: a.id, reviewerId: 'r1', score: 8, maxScore: 10,
      feedback: 'Great work', comments: 'Private note',
    });

    // Export
    const blob = await exportSvc.exportToJson();
    const bundle: ExportBundle = JSON.parse(await blob.text());

    // Verify encrypted store has the grade's encrypted feedback
    const encryptedRecords = bundle.data.encryptedStore as Array<{ id: string }>;
    expect(encryptedRecords.some(r => r.id === `grade:${grade.id}`)).toBe(true);

    // Verify canonical grade has scrubbed feedback
    const rawGrade = bundle.data.grades[0] as Record<string, unknown>;
    expect(rawGrade.feedback).toBe('[encrypted]');
  });

  it('export without encrypted data produces empty encryptedStore array', async () => {
    const blob = await exportSvc.exportToJson();
    const bundle: ExportBundle = JSON.parse(await blob.text());
    expect(bundle.data.encryptedStore).toEqual([]);
  });
});

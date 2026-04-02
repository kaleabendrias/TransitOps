import { describe, it, expect, beforeEach } from 'vitest';
import { GradingService } from '@services/grading-service';
import { PreferencesService } from '@services/preferences-service';
import { GradeRepositoryIDB } from '@adapters/indexeddb/grade-repository-idb';
import { AttemptRepositoryIDB } from '@adapters/indexeddb/attempt-repository-idb';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';
import { PreferencesRepositoryLS } from '@adapters/localstorage/preferences-repository-ls';
import { createQuestion } from '@domain/models/question';
import { createAttempt } from '@domain/models/attempt';

const actor = { userId: 'test', role: 'administrator' as const };

describe('Grading with user-configured rounding and weights', () => {
  let gradingSvc: GradingService;
  let prefsSvc: PreferencesService;
  let questionRepo: QuestionRepositoryIDB;
  let attemptRepo: AttemptRepositoryIDB;

  beforeEach(() => {
    questionRepo = new QuestionRepositoryIDB();
    attemptRepo = new AttemptRepositoryIDB();
    const prefsRepo = new PreferencesRepositoryLS();
    prefsSvc = new PreferencesService(prefsRepo);
    gradingSvc = new GradingService(
      new GradeRepositoryIDB(), attemptRepo, questionRepo, undefined, prefsRepo
    );
  });

  async function setupAttempt(type: 'essay' | 'multiple_choice', points: number) {
    const q = createQuestion({ catalogId: 'c', text: 'Q', type, correctAnswer: 'A', points, createdBy: 'u' });
    await questionRepo.save(q);
    const a = createAttempt({ questionId: q.id, userId: 'student' });
    await attemptRepo.save(a);
    return { q, a };
  }

  it('uses default 0.5 rounding when no config override', async () => {
    const { a } = await setupAttempt('essay', 10);
    const grade = await gradingSvc.manualGrade({ attemptId: a.id, reviewerId: 'r', score: 7.3, maxScore: 10, feedback: 'ok' }, actor);
    expect(grade.score).toBe(7.5);
  });

  it('uses 0.25 rounding when configured', async () => {
    prefsSvc.updatePreferences({
      gradingConfig: { roundingIncrement: 0.25, typeWeights: { essay: 2.0, multiple_choice: 1.0, single_choice: 1.0, true_false: 0.5, fill_in_the_blank: 1.0, short_answer: 1.5 } },
    });
    const { a } = await setupAttempt('essay', 10);
    const grade = await gradingSvc.manualGrade({ attemptId: a.id, reviewerId: 'r', score: 7.3, maxScore: 10, feedback: 'ok' }, actor);
    expect(grade.score).toBe(7.25);
  });

  it('uses 1.0 rounding when configured', async () => {
    prefsSvc.updatePreferences({
      gradingConfig: { roundingIncrement: 1.0, typeWeights: { essay: 2.0, multiple_choice: 1.0, single_choice: 1.0, true_false: 0.5, fill_in_the_blank: 1.0, short_answer: 1.5 } },
    });
    const { a } = await setupAttempt('essay', 10);
    const grade = await gradingSvc.manualGrade({ attemptId: a.id, reviewerId: 'r', score: 7.3, maxScore: 10, feedback: 'ok' }, actor);
    expect(grade.score).toBe(7.0);
  });

  it('auto-score uses configured type weight', async () => {
    prefsSvc.updatePreferences({
      gradingConfig: { roundingIncrement: 0.5, typeWeights: { multiple_choice: 3.0, essay: 2.0, single_choice: 1.0, true_false: 0.5, fill_in_the_blank: 1.0, short_answer: 1.5 } },
    });
    const { a } = await setupAttempt('multiple_choice', 5);
    const { grade } = await gradingSvc.submitAndAutoScore(a.id, 'A', actor);
    expect(grade!.weight).toBe(3.0);
  });

  it('manual grade uses configured type weight for essay', async () => {
    prefsSvc.updatePreferences({
      gradingConfig: { roundingIncrement: 0.5, typeWeights: { essay: 4.0, multiple_choice: 1.0, single_choice: 1.0, true_false: 0.5, fill_in_the_blank: 1.0, short_answer: 1.5 } },
    });
    const { a } = await setupAttempt('essay', 10);
    const grade = await gradingSvc.manualGrade({ attemptId: a.id, reviewerId: 'r', score: 8, maxScore: 10, feedback: 'good' }, actor);
    expect(grade.weight).toBe(4.0);
  });
});

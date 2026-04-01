import { describe, it, expect } from 'vitest';
import { createGrade, updateGradeScore, addSecondReview, flagForSecondReview } from '@domain/models/grade';

describe('Grade Model', () => {
  const make = () => createGrade({ attemptId: 'a1', questionId: 'q1', reviewerId: 'r1', score: 8, maxScore: 10 });

  it('creates with defaults', () => {
    const g = make();
    expect(g.score).toBe(8);
    expect(g.maxScore).toBe(10);
    expect(g.finalScore).toBe(8);
    expect(g.isAutoScored).toBe(false);
    expect(g.weight).toBe(1.0);
    expect(g.requiresSecondReview).toBe(false);
    expect(g.secondReviewerId).toBeNull();
    expect(g.secondReviewScore).toBeNull();
    expect(g.secondReviewFeedback).toBeNull();
    expect(g.feedback).toBe('');
    expect(g.comments).toBe('');
    expect(g.questionType).toBe('multiple_choice');
  });

  it('creates with custom fields', () => {
    const g = createGrade({ attemptId: 'a', questionId: 'q', reviewerId: 'r', score: 5, maxScore: 10, feedback: 'ok', comments: 'note', isAutoScored: true, questionType: 'essay', weight: 2.0 });
    expect(g.isAutoScored).toBe(true);
    expect(g.questionType).toBe('essay');
    expect(g.weight).toBe(2.0);
    expect(g.feedback).toBe('ok');
    expect(g.comments).toBe('note');
  });

  it('updateGradeScore without second review', () => {
    const g = make();
    const u = updateGradeScore(g, 5, 'partial');
    expect(u.score).toBe(5);
    expect(u.feedback).toBe('partial');
    expect(u.finalScore).toBe(5);
    expect(g.score).toBe(8);
  });

  it('updateGradeScore with existing second review averages', () => {
    const g = { ...make(), secondReviewScore: 6 };
    const u = updateGradeScore(g, 10, 'good');
    expect(u.finalScore).toBe((10 + 6) / 2);
  });

  it('addSecondReview averages scores', () => {
    const g = flagForSecondReview(make());
    const s = addSecondReview(g, 'r2', 6, 'lower');
    expect(s.secondReviewerId).toBe('r2');
    expect(s.secondReviewScore).toBe(6);
    expect(s.secondReviewFeedback).toBe('lower');
    expect(s.finalScore).toBe((8 + 6) / 2);
    expect(s.requiresSecondReview).toBe(false);
  });

  it('flagForSecondReview sets flag', () => {
    const g = make();
    const f = flagForSecondReview(g);
    expect(f.requiresSecondReview).toBe(true);
    expect(g.requiresSecondReview).toBe(false);
  });
});

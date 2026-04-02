import { describe, it, expect } from 'vitest';
import {
  isAutoScorable, autoScore, roundToHalf, clampGradeScore,
  getTypeWeight, computeWeightedScore, requiresSecondReview,
  validateGradeScore, SECOND_REVIEW_THRESHOLD,
} from '@domain/policies/grading-policy';
import { createQuestion } from '@domain/models/question';
import { createGrade } from '@domain/models/grade';

describe('Grading Policy', () => {
  describe('isAutoScorable', () => {
    it('MC yes', () => expect(isAutoScorable('multiple_choice')).toBe(true));
    it('TF yes', () => expect(isAutoScorable('true_false')).toBe(true));
    it('SA no', () => expect(isAutoScorable('short_answer')).toBe(false));
    it('essay no', () => expect(isAutoScorable('essay')).toBe(false));
  });

  describe('autoScore', () => {
    const mcQ = () => createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'B', points: 5, createdBy: 'u' });
    it('full points for correct', () => expect(autoScore(mcQ(), 'B')).toBe(5));
    it('0 for wrong', () => expect(autoScore(mcQ(), 'A')).toBe(0));
    it('case-insensitive', () => expect(autoScore(mcQ(), 'b')).toBe(5));
    it('trims whitespace', () => expect(autoScore(mcQ(), ' B ')).toBe(5));
    it('0 for essay type', () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: 'x', points: 10, createdBy: 'u' });
      expect(autoScore(q, 'x')).toBe(0);
    });
  });

  describe('roundToHalf', () => {
    it.each([[3.0,3.0],[3.2,3.0],[3.25,3.5],[3.3,3.5],[3.5,3.5],[3.75,4.0],[4.0,4.0],[0,0]])('%f → %f', (input, expected) => {
      expect(roundToHalf(input)).toBe(expected);
    });
  });

  describe('clampGradeScore', () => {
    it('clamps and rounds', () => expect(clampGradeScore(5.3, 10)).toBe(5.5));
    it('clamps negative to 0', () => expect(clampGradeScore(-1, 10)).toBe(0));
    it('clamps over max', () => expect(clampGradeScore(15, 10)).toBe(10));
  });

  describe('getTypeWeight', () => {
    it('MC=1', () => expect(getTypeWeight('multiple_choice')).toBe(1.0));
    it('TF=0.5', () => expect(getTypeWeight('true_false')).toBe(0.5));
    it('SA=1.5', () => expect(getTypeWeight('short_answer')).toBe(1.5));
    it('essay=2', () => expect(getTypeWeight('essay')).toBe(2.0));
  });

  describe('computeWeightedScore', () => {
    it('weighted average', () => {
      const grades = [
        createGrade({ attemptId: 'a1', questionId: 'q1', reviewerId: 'r', score: 8, maxScore: 10, weight: 1 }),
        createGrade({ attemptId: 'a2', questionId: 'q2', reviewerId: 'r', score: 5, maxScore: 10, weight: 2 }),
      ];
      expect(computeWeightedScore(grades)).toBe(60);
    });
    it('empty returns 0', () => expect(computeWeightedScore([])).toBe(0));
    it('single grade', () => {
      const g = [createGrade({ attemptId: 'a', questionId: 'q', reviewerId: 'r', score: 7, maxScore: 10, weight: 1 })];
      expect(computeWeightedScore(g)).toBe(70);
    });
  });

  describe('requiresSecondReview', () => {
    it('threshold is 10', () => expect(SECOND_REVIEW_THRESHOLD).toBe(10));
    it('true when > 10 diff', () => expect(requiresSecondReview(50, 61)).toBe(true));
    it('false when = 10 diff', () => expect(requiresSecondReview(50, 60)).toBe(false));
    it('true for negative diff > 10', () => expect(requiresSecondReview(60, 49)).toBe(true));
  });

  describe('validateGradeScore', () => {
    it('accepts valid', () => expect(validateGradeScore(5.5, 10)).toBeNull());
    it('accepts 0', () => expect(validateGradeScore(0, 10)).toBeNull());
    it('accepts max', () => expect(validateGradeScore(10, 10)).toBeNull());
    it('rejects negative', () => expect(validateGradeScore(-1, 10)).toContain('negative'));
    it('rejects over max', () => expect(validateGradeScore(11, 10)).toContain('exceed'));
    it('rejects non-half', () => expect(validateGradeScore(5.3, 10)).toContain('0.5'));
  });
});

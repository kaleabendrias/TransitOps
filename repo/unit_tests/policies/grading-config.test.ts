import { describe, it, expect } from 'vitest';
import { roundToIncrement, clampGradeScore, getTypeWeight, computeWeightedScore, validateGradeScore } from '@domain/policies/grading-policy';
import { DEFAULT_GRADING_CONFIG } from '@domain/ports/preferences-repository';
import type { GradingConfig } from '@domain/ports/preferences-repository';
import { createGrade } from '@domain/models/grade';

describe('Configurable grading rounding', () => {
  it('roundToIncrement 0.5', () => {
    expect(roundToIncrement(3.2, 0.5)).toBe(3.0);
    expect(roundToIncrement(3.3, 0.5)).toBe(3.5);
    expect(roundToIncrement(3.75, 0.5)).toBe(4.0);
  });

  it('roundToIncrement 0.25', () => {
    expect(roundToIncrement(3.1, 0.25)).toBe(3.0);
    expect(roundToIncrement(3.13, 0.25)).toBe(3.25);
    expect(roundToIncrement(3.4, 0.25)).toBe(3.5);
    expect(roundToIncrement(3.63, 0.25)).toBe(3.75);
  });

  it('roundToIncrement 1.0', () => {
    expect(roundToIncrement(3.4, 1.0)).toBe(3.0);
    expect(roundToIncrement(3.5, 1.0)).toBe(4.0);
    expect(roundToIncrement(3.7, 1.0)).toBe(4.0);
  });

  it('roundToIncrement 0 returns raw score', () => {
    expect(roundToIncrement(3.14159, 0)).toBe(3.14159);
  });

  it('clampGradeScore with custom increment', () => {
    expect(clampGradeScore(7.3, 10, 0.25)).toBe(7.25);
    expect(clampGradeScore(7.3, 10, 1.0)).toBe(7.0);
  });

  it('validateGradeScore with custom increment', () => {
    expect(validateGradeScore(7.25, 10, 0.25)).toBeNull();
    expect(validateGradeScore(7.3, 10, 0.25)).toContain('0.25-point');
    expect(validateGradeScore(7.0, 10, 1.0)).toBeNull();
    expect(validateGradeScore(7.5, 10, 1.0)).toContain('1-point');
  });
});

describe('Configurable question-type weights', () => {
  it('uses default weights when no config provided', () => {
    expect(getTypeWeight('essay')).toBe(2.0);
    expect(getTypeWeight('true_false')).toBe(0.5);
  });

  it('uses custom config weights', () => {
    const custom: GradingConfig = {
      roundingIncrement: 0.5,
      typeWeights: { ...DEFAULT_GRADING_CONFIG.typeWeights, essay: 3.0, true_false: 1.0 },
    };
    expect(getTypeWeight('essay', custom)).toBe(3.0);
    expect(getTypeWeight('true_false', custom)).toBe(1.0);
  });

  it('falls back to 1.0 for unknown type', () => {
    expect(getTypeWeight('unknown_type' as any)).toBe(1.0);
  });

  it('computeWeightedScore uses custom increment', () => {
    const grades = [
      createGrade({ attemptId: 'a', questionId: 'q', reviewerId: 'r', score: 7, maxScore: 10, weight: 1 }),
    ];
    const score05 = computeWeightedScore(grades, 0.5);
    const score1 = computeWeightedScore(grades, 1.0);
    expect(score05).toBe(70);
    expect(score1).toBe(70);
  });
});

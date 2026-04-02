import { describe, it, expect } from 'vitest';
import { isAutoScorable, autoScore, getTypeWeight } from '@domain/policies/grading-policy';
import { createQuestion, QUESTION_TYPE_LABELS } from '@domain/models/question';
import type { QuestionType } from '@domain/models/question';

describe('New question types', () => {
  it('single_choice is auto-scorable', () => expect(isAutoScorable('single_choice')).toBe(true));
  it('fill_in_the_blank is auto-scorable', () => expect(isAutoScorable('fill_in_the_blank')).toBe(true));

  it('single_choice auto-scores correctly', () => {
    const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'single_choice', correctAnswer: 'B', points: 3, createdBy: 'u' });
    expect(autoScore(q, 'B')).toBe(3);
    expect(autoScore(q, 'A')).toBe(0);
  });

  it('fill_in_the_blank auto-scores with case-insensitive match', () => {
    const q = createQuestion({ catalogId: 'c', text: 'Capital of France?', type: 'fill_in_the_blank', correctAnswer: 'Paris', points: 2, createdBy: 'u' });
    expect(autoScore(q, 'paris')).toBe(2);
    expect(autoScore(q, 'London')).toBe(0);
  });

  it('all 6 types have labels', () => {
    const types: QuestionType[] = ['multiple_choice', 'single_choice', 'true_false', 'fill_in_the_blank', 'short_answer', 'essay'];
    for (const t of types) expect(QUESTION_TYPE_LABELS[t]).toBeTruthy();
  });

  it('all 6 types have weights', () => {
    const types: QuestionType[] = ['multiple_choice', 'single_choice', 'true_false', 'fill_in_the_blank', 'short_answer', 'essay'];
    for (const t of types) expect(getTypeWeight(t)).toBeGreaterThan(0);
  });
});

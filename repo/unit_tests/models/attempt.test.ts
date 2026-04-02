import { describe, it, expect } from 'vitest';
import { createAttempt, submitAttempt } from '@domain/models/attempt';

describe('Attempt Model', () => {
  it('creates with defaults', () => {
    const a = createAttempt({ questionId: 'q1', userId: 'u1' });
    expect(a.questionId).toBe('q1');
    expect(a.userId).toBe('u1');
    expect(a.answer).toBe('');
    expect(a.status).toBe('in_progress');
    expect(a.submittedAt).toBeNull();
  });

  it('submitAttempt sets answer and status', () => {
    const a = createAttempt({ questionId: 'q1', userId: 'u1' });
    const s = submitAttempt(a, 'B');
    expect(s.answer).toBe('B');
    expect(s.status).toBe('submitted');
    expect(s.submittedAt).toBeGreaterThan(0);
    expect(a.status).toBe('in_progress');
  });
});

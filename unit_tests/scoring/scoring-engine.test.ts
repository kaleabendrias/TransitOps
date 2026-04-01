import { describe, it, expect } from 'vitest';
import { calculateSeatScore, clampScore, isPassingScore } from '@domain/scoring/scoring-engine';
import { createSeat } from '@domain/models/seat';

describe('Scoring Engine', () => {
  it('returns 0-100 range', () => {
    const s = createSeat({ venueId: 'v', row: 3, number: 10 });
    const score = calculateSeatScore(s, 10, 20);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('center > edge', () => {
    const center = calculateSeatScore(createSeat({ venueId: 'v', row: 3, number: 10 }), 10, 20);
    const edge = calculateSeatScore(createSeat({ venueId: 'v', row: 3, number: 1 }), 10, 20);
    expect(center).toBeGreaterThan(edge);
  });

  it('optimal row > far row', () => {
    const opt = calculateSeatScore(createSeat({ venueId: 'v', row: 3, number: 10 }), 10, 20);
    const far = calculateSeatScore(createSeat({ venueId: 'v', row: 10, number: 10 }), 10, 20);
    expect(opt).toBeGreaterThan(far);
  });

  it('handles 1x1', () => {
    const score = calculateSeatScore(createSeat({ venueId: 'v', row: 1, number: 1 }), 1, 1);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('custom criteria', () => {
    const s = createSeat({ venueId: 'v', row: 1, number: 1 });
    const score = calculateSeatScore(s, 5, 5, { rowWeight: 1, centerWeight: 0, proximityWeight: 0 });
    expect(score).toBeGreaterThanOrEqual(0);
  });

  describe('clampScore', () => {
    it('clamps low', () => expect(clampScore(-10)).toBe(0));
    it('clamps high', () => expect(clampScore(150)).toBe(100));
    it('passes through valid', () => expect(clampScore(50)).toBe(50));
  });

  describe('isPassingScore', () => {
    it('at threshold passes', () => expect(isPassingScore(60, 60)).toBe(true));
    it('below fails', () => expect(isPassingScore(59, 60)).toBe(false));
    it('above passes', () => expect(isPassingScore(100, 60)).toBe(true));
  });
});

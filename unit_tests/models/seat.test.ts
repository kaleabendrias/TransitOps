import { describe, it, expect } from 'vitest';
import { createSeat, updateSeatStatus, updateSeatScore } from '@domain/models/seat';

describe('Seat Model', () => {
  it('creates with correct defaults', () => {
    const s = createSeat({ venueId: 'v1', row: 3, number: 7 });
    expect(s.id).toBe('v1-R3-S7');
    expect(s.venueId).toBe('v1');
    expect(s.row).toBe(3);
    expect(s.number).toBe(7);
    expect(s.label).toBe('Row 3, Seat 7');
    expect(s.status).toBe('available');
    expect(s.score).toBe(0);
    expect(s.createdAt).toBeGreaterThan(0);
    expect(s.updatedAt).toBe(s.createdAt);
  });

  it('creates with custom score', () => {
    const s = createSeat({ venueId: 'v', row: 1, number: 1, score: 85 });
    expect(s.score).toBe(85);
  });

  it('defaults score to 0 when omitted', () => {
    const s = createSeat({ venueId: 'v', row: 1, number: 1 });
    expect(s.score).toBe(0);
  });

  it('updateSeatStatus returns new object with updated status', () => {
    const orig = createSeat({ venueId: 'v', row: 1, number: 1 });
    const updated = updateSeatStatus(orig, 'reserved');
    expect(updated.status).toBe('reserved');
    expect(orig.status).toBe('available');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(orig.updatedAt);
  });

  it('updateSeatScore returns new object with updated score', () => {
    const orig = createSeat({ venueId: 'v', row: 1, number: 1 });
    const updated = updateSeatScore(orig, 75);
    expect(updated.score).toBe(75);
    expect(orig.score).toBe(0);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(orig.updatedAt);
  });
});

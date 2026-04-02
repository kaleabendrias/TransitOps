import { describe, it, expect } from 'vitest';
import { canTransition, validateSeatTransition, canReserveSeat, canReleaseSeat, validateVenueCapacity, validateRowAndSeat } from '@domain/policies/seat-policy';
import { createSeat, updateSeatStatus } from '@domain/models/seat';

describe('Seat Policy', () => {
  describe('canTransition', () => {
    const allowed = [['available','reserved'],['available','blocked'],['reserved','available'],['reserved','occupied'],['occupied','available'],['blocked','available']] as const;
    const disallowed = [['available','occupied'],['reserved','blocked'],['occupied','reserved'],['occupied','blocked'],['blocked','reserved'],['blocked','occupied']] as const;
    for (const [from, to] of allowed) it(`${from} → ${to} allowed`, () => expect(canTransition(from, to)).toBe(true));
    for (const [from, to] of disallowed) it(`${from} → ${to} disallowed`, () => expect(canTransition(from, to)).toBe(false));
  });

  describe('validateSeatTransition', () => {
    it('returns null for valid', () => expect(validateSeatTransition(createSeat({ venueId: 'v', row: 1, number: 1 }), 'reserved')).toBeNull());
    it('returns error for same status', () => expect(validateSeatTransition(createSeat({ venueId: 'v', row: 1, number: 1 }), 'available')).toContain('already'));
    it('returns error for invalid', () => expect(validateSeatTransition(createSeat({ venueId: 'v', row: 1, number: 1 }), 'occupied')).toContain('Cannot'));
  });

  describe('canReserveSeat / canReleaseSeat', () => {
    it('can reserve available', () => expect(canReserveSeat(createSeat({ venueId: 'v', row: 1, number: 1 }))).toBe(true));
    it('cannot reserve occupied', () => expect(canReserveSeat(updateSeatStatus(updateSeatStatus(createSeat({ venueId: 'v', row: 1, number: 1 }), 'reserved'), 'occupied'))).toBe(false));
    it('can release reserved', () => expect(canReleaseSeat(updateSeatStatus(createSeat({ venueId: 'v', row: 1, number: 1 }), 'reserved'))).toBe(true));
    it('can release occupied', () => expect(canReleaseSeat(updateSeatStatus(updateSeatStatus(createSeat({ venueId: 'v', row: 1, number: 1 }), 'reserved'), 'occupied'))).toBe(true));
    it('cannot release available', () => expect(canReleaseSeat(createSeat({ venueId: 'v', row: 1, number: 1 }))).toBe(false));
  });

  describe('validateVenueCapacity', () => {
    it('null when under', () => expect(validateVenueCapacity(100, 500)).toBeNull());
    it('error at capacity', () => expect(validateVenueCapacity(500, 500)).toContain('exceeded'));
    it('error over capacity', () => expect(validateVenueCapacity(501, 500)).toContain('exceeded'));
  });

  describe('validateRowAndSeat', () => {
    it('null for valid', () => expect(validateRowAndSeat(5, 10, 10, 20)).toBeNull());
    it('error row 0', () => expect(validateRowAndSeat(0, 1, 10, 20)).toContain('Row'));
    it('error row over max', () => expect(validateRowAndSeat(11, 1, 10, 20)).toContain('Row'));
    it('error seat 0', () => expect(validateRowAndSeat(1, 0, 10, 20)).toContain('Seat'));
    it('error seat over max', () => expect(validateRowAndSeat(1, 21, 10, 20)).toContain('Seat'));
  });
});

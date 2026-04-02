import { describe, it, expect } from 'vitest';
import { createSeatMapEntry, updateSeatType, isSeatSelectable, SEAT_TYPE_LABELS, ALL_SEAT_TYPES } from '@domain/models/seat-map';

describe('SeatMapEntry Model', () => {
  it('standard is selectable', () => {
    const e = createSeatMapEntry({ tripId: 't1', row: 1, number: 5 });
    expect(e.seatType).toBe('standard');
    expect(e.selectable).toBe(true);
    expect(e.id).toBe('t1-R1-S5');
    expect(e.label).toBe('Row 1, Seat 5');
  });

  it('ada is non-selectable', () => {
    const e = createSeatMapEntry({ tripId: 't', row: 1, number: 1, seatType: 'ada' });
    expect(e.selectable).toBe(false);
  });

  it('crew is non-selectable', () => {
    const e = createSeatMapEntry({ tripId: 't', row: 1, number: 1, seatType: 'crew' });
    expect(e.selectable).toBe(false);
  });

  it('premium is selectable', () => {
    const e = createSeatMapEntry({ tripId: 't', row: 1, number: 1, seatType: 'premium' });
    expect(e.selectable).toBe(true);
  });

  it('defaults to standard when seatType omitted', () => {
    const e = createSeatMapEntry({ tripId: 't', row: 1, number: 1 });
    expect(e.seatType).toBe('standard');
  });

  it('updateSeatType immutably changes type and selectability', () => {
    const orig = createSeatMapEntry({ tripId: 't', row: 1, number: 1 });
    const updated = updateSeatType(orig, 'crew');
    expect(updated.seatType).toBe('crew');
    expect(updated.selectable).toBe(false);
    expect(orig.seatType).toBe('standard');
    expect(orig.selectable).toBe(true);
  });

  it('updateSeatType to premium makes selectable', () => {
    const e = createSeatMapEntry({ tripId: 't', row: 1, number: 1, seatType: 'ada' });
    const updated = updateSeatType(e, 'premium');
    expect(updated.selectable).toBe(true);
  });

  it('isSeatSelectable works', () => {
    expect(isSeatSelectable(createSeatMapEntry({ tripId: 't', row: 1, number: 1 }))).toBe(true);
    expect(isSeatSelectable(createSeatMapEntry({ tripId: 't', row: 1, number: 1, seatType: 'ada' }))).toBe(false);
  });

  it('ALL_SEAT_TYPES has 4 types', () => {
    expect(ALL_SEAT_TYPES).toHaveLength(4);
  });

  it('SEAT_TYPE_LABELS maps all types', () => {
    for (const t of ALL_SEAT_TYPES) expect(SEAT_TYPE_LABELS[t]).toBeTruthy();
  });
});

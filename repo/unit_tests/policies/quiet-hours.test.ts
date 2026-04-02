import { describe, it, expect } from 'vitest';
import { isInQuietHours, getQuietHoursLabel } from '@domain/policies/quiet-hours-policy';

describe('Quiet Hours Policy', () => {
  const qh = { enabled: true, start: '21:00', end: '07:00' };

  it('true during (after start)', () => expect(isInQuietHours(qh, new Date('2026-01-01T22:30:00'))).toBe(true));
  it('true during (before end)', () => expect(isInQuietHours(qh, new Date('2026-01-01T05:00:00'))).toBe(true));
  it('false outside', () => expect(isInQuietHours(qh, new Date('2026-01-01T12:00:00'))).toBe(false));
  it('false at end boundary', () => expect(isInQuietHours(qh, new Date('2026-01-01T07:00:00'))).toBe(false));
  it('true at start boundary', () => expect(isInQuietHours(qh, new Date('2026-01-01T21:00:00'))).toBe(true));
  it('false when disabled', () => expect(isInQuietHours({ ...qh, enabled: false }, new Date('2026-01-01T22:30:00'))).toBe(false));
  it('non-wrapping range', () => {
    const nr = { enabled: true, start: '09:00', end: '17:00' };
    expect(isInQuietHours(nr, new Date('2026-01-01T12:00:00'))).toBe(true);
    expect(isInQuietHours(nr, new Date('2026-01-01T18:00:00'))).toBe(false);
    expect(isInQuietHours(nr, new Date('2026-01-01T08:00:00'))).toBe(false);
  });
  it('label enabled', () => expect(getQuietHoursLabel(qh)).toBe('21:00 – 07:00'));
  it('label disabled', () => expect(getQuietHoursLabel({ ...qh, enabled: false })).toBe('Disabled'));
});

import { describe, it, expect } from 'vitest';
import { parseDateMMDDYYYY, validateDateRange, formatDateMMDDYYYY } from '@domain/models/association';

describe('Strict MM/DD/YYYY parsing', () => {
  it('parses valid date', () => {
    const d = parseDateMMDDYYYY('03/15/2026');
    expect(d).not.toBeNull();
    expect(d!.getMonth()).toBe(2);
    expect(d!.getDate()).toBe(15);
    expect(d!.getFullYear()).toBe(2026);
  });

  it('rejects single-digit month/day (no padding)', () => {
    expect(parseDateMMDDYYYY('3/5/2026')).toBeNull();
  });

  it('rejects MM-DD-YYYY (wrong separator)', () => {
    expect(parseDateMMDDYYYY('03-15-2026')).toBeNull();
  });

  it('rejects YYYY/MM/DD format', () => {
    expect(parseDateMMDDYYYY('2026/03/15')).toBeNull();
  });

  it('rejects empty string', () => {
    expect(parseDateMMDDYYYY('')).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(parseDateMMDDYYYY('not-a-date')).toBeNull();
  });

  it('rejects month 13', () => {
    expect(parseDateMMDDYYYY('13/01/2026')).toBeNull();
  });

  it('rejects month 00', () => {
    expect(parseDateMMDDYYYY('00/15/2026')).toBeNull();
  });

  it('rejects day 32', () => {
    expect(parseDateMMDDYYYY('01/32/2026')).toBeNull();
  });

  it('rejects Feb 30', () => {
    expect(parseDateMMDDYYYY('02/30/2026')).toBeNull();
  });

  it('rejects Feb 29 on non-leap year', () => {
    expect(parseDateMMDDYYYY('02/29/2025')).toBeNull();
  });

  it('accepts Feb 29 on leap year', () => {
    expect(parseDateMMDDYYYY('02/29/2024')).not.toBeNull();
  });

  it('rejects year before 1900', () => {
    expect(parseDateMMDDYYYY('01/01/1899')).toBeNull();
  });

  it('round-trips with formatDateMMDDYYYY', () => {
    const formatted = formatDateMMDDYYYY(new Date(2026, 5, 15));
    const parsed = parseDateMMDDYYYY(formatted);
    expect(parsed).not.toBeNull();
    expect(parsed!.getMonth()).toBe(5);
  });
});

describe('Date range validation', () => {
  it('valid range passes', () => {
    expect(validateDateRange('01/01/2026', '12/31/2026')).toBeNull();
  });

  it('invalid start date returns error', () => {
    const err = validateDateRange('bad', '12/31/2026');
    expect(err).toContain('Invalid start date');
    expect(err).toContain('MM/DD/YYYY');
  });

  it('invalid end date returns error', () => {
    const err = validateDateRange('01/01/2026', '13/01/2026');
    expect(err).toContain('Invalid end date');
  });

  it('end before start returns error', () => {
    expect(validateDateRange('12/31/2026', '01/01/2026')).toContain('after start');
  });

  it('same start and end returns error', () => {
    expect(validateDateRange('06/15/2026', '06/15/2026')).toContain('after start');
  });

  it('one day range passes', () => {
    expect(validateDateRange('06/15/2026', '06/16/2026')).toBeNull();
  });
});

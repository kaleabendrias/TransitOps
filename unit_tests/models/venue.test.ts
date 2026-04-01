import { describe, it, expect } from 'vitest';
import { createVenue } from '@domain/models/venue';

describe('Venue Model', () => {
  it('creates with all fields', () => {
    const v = createVenue({ name: 'Hall A', rows: 10, seatsPerRow: 20 });
    expect(v.name).toBe('Hall A');
    expect(v.rows).toBe(10);
    expect(v.seatsPerRow).toBe(20);
    expect(v.id).toBeTruthy();
    expect(v.createdAt).toBeGreaterThan(0);
    expect(v.updatedAt).toBe(v.createdAt);
  });

  it('generates unique ids', () => {
    const a = createVenue({ name: 'A', rows: 1, seatsPerRow: 1 });
    const b = createVenue({ name: 'B', rows: 1, seatsPerRow: 1 });
    expect(a.id).not.toBe(b.id);
  });
});

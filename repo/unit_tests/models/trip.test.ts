import { describe, it, expect } from 'vitest';
import { createTrip, updateTripStatus } from '@domain/models/trip';

describe('Trip Model', () => {
  it('creates with defaults', () => {
    const t = createTrip({ venueId: 'v1', name: 'Express', departureTime: 1000, createdBy: 'u1' });
    expect(t.name).toBe('Express');
    expect(t.venueId).toBe('v1');
    expect(t.departureTime).toBe(1000);
    expect(t.status).toBe('draft');
    expect(t.description).toBe('');
    expect(t.createdBy).toBe('u1');
  });

  it('creates with description', () => {
    const t = createTrip({ venueId: 'v1', name: 'T', departureTime: 1000, createdBy: 'u1', description: 'desc' });
    expect(t.description).toBe('desc');
  });

  it('updateTripStatus immutably', () => {
    const t = createTrip({ venueId: 'v1', name: 'T', departureTime: 1000, createdBy: 'u1' });
    const updated = updateTripStatus(t, 'published');
    expect(updated.status).toBe('published');
    expect(t.status).toBe('draft');
  });
});

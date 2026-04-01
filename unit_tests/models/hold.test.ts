import { describe, it, expect } from 'vitest';
import { createHold, isHoldExpired, remainingMs, expireHold, releaseHold, confirmHold, HOLD_DURATION_MS } from '@domain/models/hold';

describe('Hold Model', () => {
  const make = () => createHold({ tripId: 't1', seatMapEntryId: 's1', userId: 'u1', tabId: 'tab1' });

  it('creates with correct fields', () => {
    const h = make();
    expect(h.status).toBe('active');
    expect(h.releasedAt).toBeNull();
    expect(h.expiresAt - h.createdAt).toBe(HOLD_DURATION_MS);
    expect(h.tripId).toBe('t1');
    expect(h.seatMapEntryId).toBe('s1');
    expect(h.userId).toBe('u1');
    expect(h.tabId).toBe('tab1');
  });

  it('HOLD_DURATION_MS is 10 minutes', () => expect(HOLD_DURATION_MS).toBe(600000));

  it('isHoldExpired false for fresh hold', () => expect(isHoldExpired(make())).toBe(false));
  it('isHoldExpired true for past-expiry hold', () => {
    expect(isHoldExpired({ ...make(), expiresAt: Date.now() - 1 })).toBe(true);
  });
  it('isHoldExpired false for non-active hold', () => {
    expect(isHoldExpired(releaseHold(make()))).toBe(false);
  });

  it('remainingMs > 0 for fresh hold', () => {
    const ms = remainingMs(make());
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(HOLD_DURATION_MS);
  });
  it('remainingMs 0 for expired', () => expect(remainingMs({ ...make(), expiresAt: Date.now() - 1000 })).toBe(0));
  it('remainingMs 0 for non-active', () => expect(remainingMs(releaseHold(make()))).toBe(0));

  it('expireHold sets status and releasedAt', () => {
    const h = make();
    const e = expireHold(h);
    expect(e.status).toBe('expired');
    expect(e.releasedAt).toBeGreaterThan(0);
    expect(h.status).toBe('active');
  });

  it('releaseHold sets status and releasedAt', () => {
    const r = releaseHold(make());
    expect(r.status).toBe('released');
    expect(r.releasedAt).toBeGreaterThan(0);
  });

  it('confirmHold sets status', () => {
    const c = confirmHold(make());
    expect(c.status).toBe('confirmed');
  });
});

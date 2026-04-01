import { describe, it, expect } from 'vitest';
import { canPlaceHold, canReleaseHold, canConfirmHold, shouldAutoRelease } from '@domain/policies/hold-policy';
import { createSeatMapEntry } from '@domain/models/seat-map';
import { createHold, expireHold, releaseHold } from '@domain/models/hold';

describe('Hold Policy', () => {
  const makeSeat = (type?: 'standard' | 'ada' | 'crew' | 'premium') => createSeatMapEntry({ tripId: 't', row: 1, number: 1, seatType: type });
  const makeHold = (overrides = {}) => ({ ...createHold({ tripId: 't', seatMapEntryId: 's', userId: 'u1', tabId: 'tab' }), ...overrides });

  describe('canPlaceHold', () => {
    it('allows on selectable seat with no hold', () => expect(canPlaceHold(makeSeat(), null)).toBeNull());
    it('allows on premium seat', () => expect(canPlaceHold(makeSeat('premium'), null)).toBeNull());
    it('rejects ada', () => expect(canPlaceHold(makeSeat('ada'), null)).toContain('not selectable'));
    it('rejects crew', () => expect(canPlaceHold(makeSeat('crew'), null)).toContain('not selectable'));
    it('rejects when active hold exists', () => expect(canPlaceHold(makeSeat(), makeHold())).toContain('already held'));
    it('allows when existing hold is expired', () => expect(canPlaceHold(makeSeat(), makeHold({ expiresAt: Date.now() - 1000 }))).toBeNull());
  });

  describe('canReleaseHold', () => {
    it('allows owner to release active', () => expect(canReleaseHold(makeHold(), 'u1')).toBeNull());
    it('rejects non-owner', () => expect(canReleaseHold(makeHold(), 'u2')).toContain('owner'));
    it('rejects non-active', () => expect(canReleaseHold(expireHold(makeHold()), 'u1')).toContain('not active'));
  });

  describe('canConfirmHold', () => {
    it('allows owner to confirm active non-expired', () => expect(canConfirmHold(makeHold(), 'u1')).toBeNull());
    it('rejects expired', () => expect(canConfirmHold(makeHold({ expiresAt: Date.now() - 1 }), 'u1')).toContain('expired'));
    it('rejects non-owner', () => expect(canConfirmHold(makeHold(), 'u2')).toContain('owner'));
    it('rejects non-active status', () => expect(canConfirmHold(releaseHold(makeHold()), 'u1')).toContain('not active'));
  });

  describe('shouldAutoRelease', () => {
    it('true for expired active', () => expect(shouldAutoRelease(makeHold({ expiresAt: Date.now() - 1 }))).toBe(true));
    it('false for fresh active', () => expect(shouldAutoRelease(makeHold())).toBe(false));
    it('false for released', () => expect(shouldAutoRelease(releaseHold(makeHold()))).toBe(false));
  });
});

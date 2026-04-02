import { describe, it, expect } from 'vitest';
import { isRateLimited, addTimestamp, canRetry, isDeadLetter, shouldMoveToDead, getDeliveryAge, getReadAge, RATE_LIMIT_PER_MINUTE, MAX_RETRIES } from '@domain/policies/notification-policy';
import { createNotification, markFailed, markDelivered, markRead } from '@domain/models/notification';
import type { RateLimitState } from '@domain/policies/notification-policy';

describe('Notification Policy', () => {
  describe('rate limiting', () => {
    it('constants', () => { expect(RATE_LIMIT_PER_MINUTE).toBe(30); expect(MAX_RETRIES).toBe(3); });
    it('not limited with few', () => expect(isRateLimited({ userId: 'u', timestamps: [Date.now()] })).toBe(false));
    it('limited at 30', () => {
      const ts = Array.from({ length: 30 }, (_, i) => Date.now() - i * 100);
      expect(isRateLimited({ userId: 'u', timestamps: ts })).toBe(true);
    });
    it('old timestamps not counted', () => {
      const ts = Array.from({ length: 30 }, () => Date.now() - 120_000);
      expect(isRateLimited({ userId: 'u', timestamps: ts })).toBe(false);
    });
    it('addTimestamp prunes old', () => {
      const state: RateLimitState = { userId: 'u', timestamps: [Date.now() - 120_000] };
      const updated = addTimestamp(state);
      expect(updated.timestamps).toHaveLength(1);
      expect(updated.timestamps[0]).toBeGreaterThan(Date.now() - 1000);
    });
    it('addTimestamp adds new', () => {
      const state: RateLimitState = { userId: 'u', timestamps: [] };
      const updated = addTimestamp(state);
      expect(updated.timestamps).toHaveLength(1);
    });
  });

  describe('retry policy', () => {
    it('canRetry failed with retries left', () => {
      const n = markFailed(createNotification({ userId: 'u', templateId: 't', subject: 'S', body: 'B' }));
      expect(canRetry(n)).toBe(true);
    });
    it('cannot retry dead_letter', () => {
      let n = createNotification({ userId: 'u', templateId: 't', subject: 'S', body: 'B' });
      for (let i = 0; i < 3; i++) { n = markFailed(n); if (i < 2) n = { ...n, status: 'failed' as const }; }
      expect(canRetry(n)).toBe(false);
    });
    it('cannot retry delivered', () => {
      const n = markDelivered(createNotification({ userId: 'u', templateId: 't', subject: 'S', body: 'B' }));
      expect(canRetry(n)).toBe(false);
    });
    it('isDeadLetter', () => {
      expect(isDeadLetter({ ...createNotification({ userId: 'u', templateId: 't', subject: 'S', body: 'B' }), status: 'dead_letter' })).toBe(true);
      expect(isDeadLetter(createNotification({ userId: 'u', templateId: 't', subject: 'S', body: 'B' }))).toBe(false);
    });
    it('shouldMoveToDead', () => {
      const n = { ...createNotification({ userId: 'u', templateId: 't', subject: 'S', body: 'B' }), status: 'failed' as const, retryCount: 3 };
      expect(shouldMoveToDead(n)).toBe(true);
    });
  });

  describe('age helpers', () => {
    it('getDeliveryAge returns -1 if not delivered', () => expect(getDeliveryAge(createNotification({ userId: 'u', templateId: 't', subject: 'S', body: 'B' }))).toBe(-1));
    it('getDeliveryAge returns positive if delivered', () => {
      const n = markDelivered(createNotification({ userId: 'u', templateId: 't', subject: 'S', body: 'B' }));
      expect(getDeliveryAge(n)).toBeGreaterThanOrEqual(0);
    });
    it('getReadAge returns -1 if not read', () => expect(getReadAge(createNotification({ userId: 'u', templateId: 't', subject: 'S', body: 'B' }))).toBe(-1));
    it('getReadAge returns positive if read', () => {
      const n = markRead(markDelivered(createNotification({ userId: 'u', templateId: 't', subject: 'S', body: 'B' })));
      expect(getReadAge(n)).toBeGreaterThanOrEqual(0);
    });
  });
});

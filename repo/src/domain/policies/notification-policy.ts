import type { Notification } from '../models/notification';

export const RATE_LIMIT_PER_MINUTE = 30;
export const MAX_RETRIES = 3;

export interface RateLimitState {
  userId: string;
  timestamps: number[];
}

export function isRateLimited(state: RateLimitState, now: number = Date.now()): boolean {
  const oneMinuteAgo = now - 60_000;
  const recent = state.timestamps.filter((t) => t > oneMinuteAgo);
  return recent.length >= RATE_LIMIT_PER_MINUTE;
}

export function addTimestamp(state: RateLimitState, now: number = Date.now()): RateLimitState {
  const oneMinuteAgo = now - 60_000;
  const timestamps = [...state.timestamps.filter((t) => t > oneMinuteAgo), now];
  return { ...state, timestamps };
}

export function canRetry(notification: Notification): boolean {
  return notification.status === 'failed' && notification.retryCount < MAX_RETRIES;
}

export function isDeadLetter(notification: Notification): boolean {
  return notification.status === 'dead_letter';
}

export function shouldMoveToDead(notification: Notification): boolean {
  return notification.status === 'failed' && notification.retryCount >= MAX_RETRIES;
}

export function getDeliveryAge(notification: Notification): number {
  if (!notification.deliveredAt) return -1;
  return Date.now() - notification.deliveredAt;
}

export function getReadAge(notification: Notification): number {
  if (!notification.readAt) return -1;
  return Date.now() - notification.readAt;
}

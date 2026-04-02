import { describe, it, expect } from 'vitest';
import { createNotification, markDelivered, markRead, markFailed, incrementRetry, renderTemplate, createTemplate } from '@domain/models/notification';

describe('Notification Model', () => {
  const make = () => createNotification({ userId: 'u1', templateId: 't1', subject: 'Hi', body: 'Hello' });

  it('creates with defaults', () => {
    const n = make();
    expect(n.status).toBe('pending');
    expect(n.retryCount).toBe(0);
    expect(n.maxRetries).toBe(3);
    expect(n.channel).toBe('in_app');
    expect(n.deliveredAt).toBeNull();
    expect(n.readAt).toBeNull();
  });

  it('creates with variables', () => {
    const n = createNotification({ userId: 'u1', templateId: 't1', subject: 'S', body: 'B', variables: { name: 'Alice' } });
    expect(n.variables).toEqual({ name: 'Alice' });
  });

  it('markDelivered', () => {
    const d = markDelivered(make());
    expect(d.status).toBe('delivered');
    expect(d.deliveredAt).toBeGreaterThan(0);
  });

  it('markRead', () => {
    const r = markRead(markDelivered(make()));
    expect(r.status).toBe('read');
    expect(r.readAt).toBeGreaterThan(0);
  });

  it('markFailed increments retry', () => {
    const f = markFailed(make());
    expect(f.retryCount).toBe(1);
    expect(f.status).toBe('failed');
  });

  it('markFailed moves to dead_letter at max', () => {
    let n = make();
    n = markFailed(n);
    n = { ...n, status: 'failed' as const };
    n = markFailed(n);
    n = { ...n, status: 'failed' as const };
    n = markFailed(n);
    expect(n.status).toBe('dead_letter');
    expect(n.retryCount).toBe(3);
  });

  it('incrementRetry resets to pending', () => {
    const f = markFailed(make());
    const r = incrementRetry(f);
    expect(r.status).toBe('pending');
    expect(r.retryCount).toBe(2);
  });
});

describe('Template Rendering', () => {
  it('replaces variables', () => {
    expect(renderTemplate('Hi {{name}}!', { name: 'Bob' })).toBe('Hi Bob!');
  });
  it('leaves unknown variables', () => {
    expect(renderTemplate('Hi {{name}}!', {})).toBe('Hi {{name}}!');
  });
  it('handles multiple variables', () => {
    expect(renderTemplate('{{a}} + {{b}} = {{c}}', { a: '1', b: '2', c: '3' })).toBe('1 + 2 = 3');
  });
  it('createTemplate', () => {
    const t = createTemplate({ name: 'Welcome', subjectTemplate: 'Hi {{name}}', bodyTemplate: 'Welcome!' });
    expect(t.name).toBe('Welcome');
    expect(t.channel).toBe('in_app');
    expect(t.id).toBeTruthy();
  });
});

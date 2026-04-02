import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationService } from '@services/notification-service';
import type { NotificationActor } from '@services/notification-service';
import { NotificationRepositoryIDB, NotificationTemplateRepositoryIDB, NotificationSubscriptionRepositoryIDB } from '@adapters/indexeddb/notification-repository-idb';
import { createTemplate } from '@domain/models/notification';

describe('NotificationService', () => {
  let svc: NotificationService;
  let templateRepo: NotificationTemplateRepositoryIDB;
  const actor = (uid: string): NotificationActor => ({ userId: uid, role: 'administrator' });

  beforeEach(() => {
    const notifRepo = new NotificationRepositoryIDB();
    templateRepo = new NotificationTemplateRepositoryIDB();
    const subRepo = new NotificationSubscriptionRepositoryIDB();
    svc = new NotificationService(notifRepo, templateRepo, subRepo);
  });

  it('sends notification with template rendering', async () => {
    const t = createTemplate({ name: 'Welcome', subjectTemplate: 'Hi {{name}}', bodyTemplate: 'Welcome {{name}}!' });
    await templateRepo.save(t);

    const n = await svc.send('u1', t.id, { name: 'Alice' });
    expect(n.subject).toBe('Hi Alice');
    expect(n.body).toBe('Welcome Alice!');
    expect(n.status).toBe('delivered');
    expect(n.deliveredAt).toBeGreaterThan(0);
  });

  it('sends without template (fallback to variables)', async () => {
    const n = await svc.send('u1', 'nonexistent', { subject: 'Test', body: 'Hello' });
    expect(n.subject).toBe('Test');
    expect(n.body).toBe('Hello');
  });

  it('rate limits at 30 per minute', async () => {
    for (let i = 0; i < 30; i++) {
      await svc.send('u_rate', 'tpl', { subject: `N${i}`, body: '' });
    }
    await expect(svc.send('u_rate', 'tpl', { subject: 'N31', body: '' })).rejects.toThrow('Rate limit');
  });

  it('rate limit is per-user', async () => {
    for (let i = 0; i < 30; i++) {
      await svc.send('u_a', 'tpl', { subject: `N${i}`, body: '' });
    }
    const n = await svc.send('u_b', 'tpl', { subject: 'OK', body: '' });
    expect(n.status).toBe('delivered');
  });

  it('markAsRead sets read timestamp', async () => {
    const n = await svc.send('u1', 'tpl', { subject: 'S', body: 'B' });
    const read = await svc.markAsRead(n.id, actor('u1'));
    expect(read.status).toBe('read');
    expect(read.readAt).toBeGreaterThan(0);
  });

  it('fail moves to failed then dead_letter', async () => {
    const n = await svc.send('u1', 'tpl', { subject: 'S', body: 'B' });
    const a = actor('u1');
    const f1 = await svc.fail(n.id, a);
    expect(f1.status).toBe('failed');
    expect(f1.retryCount).toBe(1);

    const retried = await svc.retry(f1.id, a);
    expect(retried.status).toBe('delivered');

    const f2 = await svc.fail(retried.id, a);
    expect(f2.retryCount).toBe(3);
    expect(f2.status).toBe('dead_letter');

    await expect(svc.retry(f2.id, a)).rejects.toThrow('cannot be retried');
  });

  it('getUnread returns only delivered', async () => {
    await svc.send('u2', 'tpl', { subject: 'A', body: '' });
    const n2 = await svc.send('u2', 'tpl', { subject: 'B', body: '' });
    await svc.markAsRead(n2.id, actor('u2'));

    const unread = await svc.getUnread('u2', actor('u2'));
    expect(unread.length).toBe(1);
    expect(unread[0].subject).toBe('A');
  });

  it('getDeadLetterInbox', async () => {
    const n = await svc.send('u3', 'tpl', { subject: 'S', body: '' });
    const a = actor('u3');
    let current = await svc.fail(n.id, a);
    current = await svc.fail(current.id, a);
    await svc.fail(current.id, a);

    const dead = await svc.getDeadLetterInbox(actor('u3'));
    expect(dead.length).toBe(1);
  });

  it('subscription management', async () => {
    await svc.updateSubscription('u1', 'tpl1', false, actor('u1'));
    const subs = await svc.getSubscriptions('u1', actor('u1'));
    expect(subs.length).toBe(1);
    expect(subs[0].enabled).toBe(false);

    await expect(svc.send('u1', 'tpl1', { subject: 'S', body: '' })).rejects.toThrow('unsubscribed');
  });

  it('rejects markAsRead for unknown', async () => {
    await expect(svc.markAsRead('bogus', actor('u1'))).rejects.toThrow('not found');
  });

  it('rejects fail for unknown', async () => {
    await expect(svc.fail('bogus', actor('u1'))).rejects.toThrow('not found');
  });

  it('rejects retry for unknown', async () => {
    await expect(svc.retry('bogus', actor('u1'))).rejects.toThrow('not found');
  });
});

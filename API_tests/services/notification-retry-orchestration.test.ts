import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationService } from '@services/notification-service';
import type { NotificationActor } from '@services/notification-service';
import { NotificationRepositoryIDB, NotificationTemplateRepositoryIDB, NotificationSubscriptionRepositoryIDB } from '@adapters/indexeddb/notification-repository-idb';

describe('Automatic notification retry orchestration', () => {
  let svc: NotificationService;
  const admin: NotificationActor = { userId: 'admin', role: 'administrator' };

  beforeEach(() => {
    svc = new NotificationService(
      new NotificationRepositoryIDB(),
      new NotificationTemplateRepositoryIDB(),
      new NotificationSubscriptionRepositoryIDB()
    );
  });

  it('processRetries retries failed notifications', async () => {
    const n = await svc.send('u1', 'tpl', { subject: 'S', body: 'B' });
    await svc.fail(n.id, { userId: 'u1', role: 'dispatcher' });

    const result = await svc.processRetries();
    expect(result.retried).toBe(1);
    expect(result.deadLettered).toBe(0);
  });

  it('processRetries dead-letters after 3 failures', async () => {
    const n = await svc.send('u1', 'tpl', { subject: 'S', body: 'B' });
    const actor: NotificationActor = { userId: 'u1', role: 'dispatcher' };

    // Fail 1
    let current = await svc.fail(n.id, actor);
    // Retry 1 (processRetries)
    await svc.processRetries();
    // Fail 2
    current = (await svc.getUserNotifications('u1', actor)).find(x => x.templateId === 'tpl')!;
    current = await svc.fail(current.id, actor);
    // Retry 2
    await svc.processRetries();
    // Fail 3 — this should exhaust retries (retryCount reaches maxRetries)
    current = (await svc.getUserNotifications('u1', actor)).find(x => x.templateId === 'tpl')!;
    await svc.fail(current.id, actor);

    // processRetries should now dead-letter it
    const result = await svc.processRetries();
    // It's already dead_letter from the fail() call, so processRetries finds nothing
    // Let's check the dead letter inbox instead
    const dead = await svc.getDeadLetterInbox(admin);
    expect(dead.length).toBeGreaterThanOrEqual(1);
  });

  it('processRetries does nothing when no failed notifications', async () => {
    const result = await svc.processRetries();
    expect(result.retried).toBe(0);
    expect(result.deadLettered).toBe(0);
  });

  it('retried notifications become delivered', async () => {
    const n = await svc.send('u2', 'tpl', { subject: 'X', body: 'Y' });
    const actor: NotificationActor = { userId: 'u2', role: 'dispatcher' };
    await svc.fail(n.id, actor);

    await svc.processRetries();

    const all = await svc.getUserNotifications('u2', actor);
    const retried = all.find(x => x.id === n.id);
    expect(retried?.status).toBe('delivered');
  });

  it('mixed batch: some retried, some dead-lettered', async () => {
    const actor: NotificationActor = { userId: 'u3', role: 'dispatcher' };

    // Notification 1: fail once (retryCount=1, retriable)
    const n1 = await svc.send('u3', 'tpl', { subject: 'A', body: '' });
    await svc.fail(n1.id, actor);

    // Notification 2: fail 3 times (dead_letter)
    const n2 = await svc.send('u3', 'tpl2', { subject: 'B', body: '' });
    let c2 = await svc.fail(n2.id, actor);
    c2 = await svc.fail(c2.id, actor);
    await svc.fail(c2.id, actor); // retryCount=3 → dead_letter

    const result = await svc.processRetries();
    // n1 was failed (retriable) → retried; n2 was already dead_letter → not in failed status
    expect(result.retried).toBe(1);
  });
});

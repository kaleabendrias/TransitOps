import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationService } from '@services/notification-service';
import type { NotificationActor } from '@services/notification-service';
import { NotificationRepositoryIDB, NotificationTemplateRepositoryIDB, NotificationSubscriptionRepositoryIDB } from '@adapters/indexeddb/notification-repository-idb';

describe('Notification object-level authorization', () => {
  let svc: NotificationService;

  beforeEach(() => {
    svc = new NotificationService(
      new NotificationRepositoryIDB(),
      new NotificationTemplateRepositoryIDB(),
      new NotificationSubscriptionRepositoryIDB()
    );
  });

  const ownerActor: NotificationActor = { userId: 'owner1', role: 'dispatcher' };
  const otherActor: NotificationActor = { userId: 'other1', role: 'dispatcher' };
  const adminActor: NotificationActor = { userId: 'admin1', role: 'administrator' };

  it('owner can markAsRead their own notification', async () => {
    const n = await svc.send('owner1', 'tpl', { subject: 'S', body: 'B' });
    const read = await svc.markAsRead(n.id, ownerActor);
    expect(read.status).toBe('read');
  });

  it('non-owner cannot markAsRead another user notification', async () => {
    const n = await svc.send('owner1', 'tpl', { subject: 'S', body: 'B' });
    await expect(svc.markAsRead(n.id, otherActor)).rejects.toThrow('Access denied');
  });

  it('admin can markAsRead any notification', async () => {
    const n = await svc.send('owner1', 'tpl', { subject: 'S', body: 'B' });
    const read = await svc.markAsRead(n.id, adminActor);
    expect(read.status).toBe('read');
  });

  it('non-owner cannot retry another user notification', async () => {
    const n = await svc.send('owner1', 'tpl', { subject: 'S', body: 'B' });
    const failed = await svc.fail(n.id, ownerActor);
    await expect(svc.retry(failed.id, otherActor)).rejects.toThrow('Access denied');
  });

  it('owner can retry their own failed notification', async () => {
    const n = await svc.send('owner1', 'tpl', { subject: 'S', body: 'B' });
    const failed = await svc.fail(n.id, ownerActor);
    const retried = await svc.retry(failed.id, ownerActor);
    expect(retried.status).toBe('delivered');
  });

  it('non-owner cannot fail another user notification', async () => {
    const n = await svc.send('owner1', 'tpl', { subject: 'S', body: 'B' });
    await expect(svc.fail(n.id, otherActor)).rejects.toThrow('Access denied');
  });

  it('non-owner cannot read another user notification list', async () => {
    await svc.send('owner1', 'tpl', { subject: 'S', body: 'B' });
    await expect(svc.getUserNotifications('owner1', otherActor)).rejects.toThrow('Access denied');
  });

  it('owner can read their own notification list', async () => {
    await svc.send('owner1', 'tpl', { subject: 'S', body: 'B' });
    const list = await svc.getUserNotifications('owner1', ownerActor);
    expect(list.length).toBe(1);
  });

  it('non-admin cannot access dead-letter inbox', async () => {
    await expect(svc.getDeadLetterInbox(ownerActor)).rejects.toThrow('Only administrators');
  });

  it('admin can access dead-letter inbox', async () => {
    const dead = await svc.getDeadLetterInbox(adminActor);
    expect(Array.isArray(dead)).toBe(true);
  });

  it('non-owner cannot read unread list of another user', async () => {
    await svc.send('owner1', 'tpl', { subject: 'S', body: 'B' });
    await expect(svc.getUnread('owner1', otherActor)).rejects.toThrow('Access denied');
  });
});

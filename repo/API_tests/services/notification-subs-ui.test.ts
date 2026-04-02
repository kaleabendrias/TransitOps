import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationService } from '@services/notification-service';
import type { NotificationActor } from '@services/notification-service';
import { NotificationRepositoryIDB, NotificationTemplateRepositoryIDB, NotificationSubscriptionRepositoryIDB } from '@adapters/indexeddb/notification-repository-idb';

describe('Notification subscription preferences (Settings UI flow)', () => {
  let svc: NotificationService;
  const actor = (uid: string): NotificationActor => ({ userId: uid, role: 'dispatcher' });
  const adminActor: NotificationActor = { userId: 'admin', role: 'administrator' };

  beforeEach(() => {
    svc = new NotificationService(
      new NotificationRepositoryIDB(),
      new NotificationTemplateRepositoryIDB(),
      new NotificationSubscriptionRepositoryIDB()
    );
  });

  it('getSubscriptions returns empty for new user', async () => {
    const subs = await svc.getSubscriptions('new-user', actor('new-user'));
    expect(subs).toEqual([]);
  });

  it('updateSubscription creates and persists preference', async () => {
    await svc.updateSubscription('u1', 'grade_posted', false, actor('u1'));
    const subs = await svc.getSubscriptions('u1', actor('u1'));
    expect(subs.length).toBe(1);
    expect(subs[0].templateId).toBe('grade_posted');
    expect(subs[0].enabled).toBe(false);
  });

  it('toggling subscription on and off', async () => {
    await svc.updateSubscription('u1', 'trip_update', true, actor('u1'));
    await svc.updateSubscription('u1', 'trip_update', false, actor('u1'));
    const subs = await svc.getSubscriptions('u1', actor('u1'));
    const sub = subs.find(s => s.templateId === 'trip_update');
    expect(sub?.enabled).toBe(false);
  });

  it('disabled subscription blocks notification send', async () => {
    await svc.updateSubscription('u1', 'blocked_tpl', false, actor('u1'));
    await expect(svc.send('u1', 'blocked_tpl', { subject: 'X', body: 'Y' }))
      .rejects.toThrow('unsubscribed');
  });

  it('enabled subscription allows notification send', async () => {
    await svc.updateSubscription('u1', 'allowed_tpl', true, actor('u1'));
    const n = await svc.send('u1', 'allowed_tpl', { subject: 'Hi', body: 'There' });
    expect(n.status).toBe('delivered');
  });

  it('non-owner cannot update another user subscription', async () => {
    await expect(svc.updateSubscription('victim', 'tpl', false, actor('attacker')))
      .rejects.toThrow('Access denied');
  });

  it('non-owner cannot read another user subscriptions', async () => {
    await expect(svc.getSubscriptions('victim', actor('attacker')))
      .rejects.toThrow('Access denied');
  });

  it('admin can manage any user subscriptions', async () => {
    await svc.updateSubscription('u1', 'tpl', true, adminActor);
    const subs = await svc.getSubscriptions('u1', adminActor);
    expect(subs.length).toBe(1);
  });
});

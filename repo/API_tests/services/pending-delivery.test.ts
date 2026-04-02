import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationService } from '@services/notification-service';
import { NotificationRepositoryIDB, NotificationTemplateRepositoryIDB, NotificationSubscriptionRepositoryIDB } from '@adapters/indexeddb/notification-repository-idb';
import { PreferencesRepositoryLS } from '@adapters/localstorage/preferences-repository-ls';
import type { UserPreferences } from '@domain/ports/preferences-repository';
import { DEFAULT_PREFERENCES } from '@domain/ports/preferences-repository';

describe('processPending delivery', () => {
  let svc: NotificationService;
  let prefsRepo: PreferencesRepositoryLS;
  let notifRepo: NotificationRepositoryIDB;

  beforeEach(() => {
    prefsRepo = new PreferencesRepositoryLS();
    notifRepo = new NotificationRepositoryIDB();
    svc = new NotificationService(
      notifRepo,
      new NotificationTemplateRepositoryIDB(),
      new NotificationSubscriptionRepositoryIDB(),
      prefsRepo
    );
  });

  function setQuietHoursForUser(userId: string, enabled: boolean, start: string, end: string) {
    const prefs: UserPreferences = { ...DEFAULT_PREFERENCES, quietHours: { enabled, start, end } };
    prefsRepo.save(prefs, userId);
  }

  it('delivers notifications when quiet hours end', async () => {
    setQuietHoursForUser('u1', true, '00:00', '23:59');
    const n = await svc.send('u1', 'tpl', { subject: 'Hello', body: 'World' });
    expect(n.status).toBe('pending');

    // Disable quiet hours so processPending can deliver
    setQuietHoursForUser('u1', false, '00:00', '23:59');
    const result = await svc.processPending();
    expect(result.delivered).toBe(1);
  });

  it('leaves notifications pending during quiet hours', async () => {
    setQuietHoursForUser('u2', true, '00:00', '23:59');
    await svc.send('u2', 'tpl', { subject: 'Quiet', body: 'Shh' });

    const result = await svc.processPending();
    expect(result.stillPending).toBe(1);
    expect(result.delivered).toBe(0);
  });

  it('handles multiple users with different quiet hours', async () => {
    // userA stays in quiet hours, userB gets quiet hours disabled
    setQuietHoursForUser('userA', true, '00:00', '23:59');
    setQuietHoursForUser('userB', true, '00:00', '23:59');

    await svc.send('userA', 'tpl', { subject: 'A', body: '' });
    await svc.send('userB', 'tpl', { subject: 'B', body: '' });

    // Only disable quiet hours for userB
    setQuietHoursForUser('userB', false, '00:00', '23:59');

    const result = await svc.processPending();
    expect(result.delivered).toBe(1);
    expect(result.stillPending).toBe(1);
  });

  it('returns zeros when no pending notifications exist', async () => {
    const result = await svc.processPending();
    expect(result.delivered).toBe(0);
    expect(result.stillPending).toBe(0);
  });

  it('sets deliveredAt timestamp on pending-to-delivered transition', async () => {
    setQuietHoursForUser('u3', true, '00:00', '23:59');
    const n = await svc.send('u3', 'tpl', { subject: 'Check', body: 'Timestamp' });
    expect(n.deliveredAt).toBeNull();

    setQuietHoursForUser('u3', false, '00:00', '23:59');
    await svc.processPending();

    const notifications = await notifRepo.getByUser('u3');
    const delivered = notifications.find((notif) => notif.id === n.id);
    expect(delivered).toBeDefined();
    expect(delivered!.status).toBe('delivered');
    expect(delivered!.deliveredAt).toBeGreaterThan(0);
  });
});

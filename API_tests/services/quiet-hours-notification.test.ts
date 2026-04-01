import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationService } from '@services/notification-service';
import { NotificationRepositoryIDB, NotificationTemplateRepositoryIDB, NotificationSubscriptionRepositoryIDB } from '@adapters/indexeddb/notification-repository-idb';
import { PreferencesRepositoryLS } from '@adapters/localstorage/preferences-repository-ls';
import { createTemplate } from '@domain/models/notification';
import type { UserPreferences } from '@domain/ports/preferences-repository';
import { DEFAULT_PREFERENCES } from '@domain/ports/preferences-repository';

describe('Notification quiet hours enforcement', () => {
  let svc: NotificationService;
  let prefsRepo: PreferencesRepositoryLS;
  let templateRepo: NotificationTemplateRepositoryIDB;

  beforeEach(() => {
    prefsRepo = new PreferencesRepositoryLS();
    templateRepo = new NotificationTemplateRepositoryIDB();
    svc = new NotificationService(
      new NotificationRepositoryIDB(),
      templateRepo,
      new NotificationSubscriptionRepositoryIDB(),
      prefsRepo
    );
  });

  /** Set quiet hours for a specific recipient userId. */
  function setQuietHoursForUser(userId: string, enabled: boolean, start: string, end: string) {
    const prefs: UserPreferences = { ...DEFAULT_PREFERENCES, quietHours: { enabled, start, end } };
    prefsRepo.save(prefs, userId);
  }

  it('delivers normally outside quiet hours', async () => {
    setQuietHoursForUser('u1', false, '03:00', '03:01');
    const n = await svc.send('u1', 'tpl', { subject: 'Hello', body: 'World' });
    expect(n.status).toBe('delivered');
    expect(n.deliveredAt).toBeGreaterThan(0);
  });

  it('queues as pending during quiet hours', async () => {
    setQuietHoursForUser('u1', true, '00:00', '23:59');
    const n = await svc.send('u1', 'tpl', { subject: 'Quiet', body: 'Shh' });
    expect(n.status).toBe('pending');
    expect(n.deliveredAt).toBeNull();
  });

  it('quiet hours does not skip rate limiting', async () => {
    setQuietHoursForUser('u_rate_qh', true, '00:00', '23:59');
    for (let i = 0; i < 30; i++) {
      await svc.send('u_rate_qh', 'tpl', { subject: `N${i}`, body: '' });
    }
    await expect(svc.send('u_rate_qh', 'tpl', { subject: 'N31', body: '' })).rejects.toThrow('Rate limit');
  });

  it('delivers when quiet hours disabled', async () => {
    setQuietHoursForUser('u2', false, '00:00', '23:59');
    const n = await svc.send('u2', 'tpl', { subject: 'Hi', body: 'There' });
    expect(n.status).toBe('delivered');
  });

  it('queued notification preserves template rendering', async () => {
    const t = createTemplate({ name: 'Greet', subjectTemplate: 'Hi {{name}}', bodyTemplate: 'Welcome {{name}}!' });
    await templateRepo.save(t);
    setQuietHoursForUser('u3', true, '00:00', '23:59');
    const n = await svc.send('u3', t.id, { name: 'Bob' });
    expect(n.status).toBe('pending');
    expect(n.subject).toBe('Hi Bob');
    expect(n.body).toBe('Welcome Bob!');
  });

  it('recipient quiet hours are checked, not sender', async () => {
    // Sender has quiet hours OFF, recipient has quiet hours ON
    setQuietHoursForUser('sender', false, '00:00', '23:59');
    setQuietHoursForUser('recipient', true, '00:00', '23:59');
    const n = await svc.send('recipient', 'tpl', { subject: 'X', body: 'Y' });
    expect(n.status).toBe('pending'); // recipient's quiet hours block delivery
  });

  it('different users have independent quiet hours', async () => {
    setQuietHoursForUser('userA', true, '00:00', '23:59');
    setQuietHoursForUser('userB', false, '00:00', '23:59');
    const a = await svc.send('userA', 'tpl', { subject: 'A', body: '' });
    const b = await svc.send('userB', 'tpl', { subject: 'B', body: '' });
    expect(a.status).toBe('pending');
    expect(b.status).toBe('delivered');
  });
});

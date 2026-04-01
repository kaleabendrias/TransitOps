import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '@services/auth-service';
import { ExportImportService } from '@services/export-import-service';
import { NotificationService } from '@services/notification-service';
import type { NotificationActor } from '@services/notification-service';
import { UserRepositoryIDB } from '@adapters/indexeddb/user-repository-idb';
import { AuthRepositoryLS } from '@adapters/localstorage/auth-repository-ls';
import { NotificationRepositoryIDB, NotificationTemplateRepositoryIDB, NotificationSubscriptionRepositoryIDB } from '@adapters/indexeddb/notification-repository-idb';
import { getAuditEntries, clearAuditEntries } from '@services/audit-log';
import type { ExportBundle } from '@services/export-import-service';

describe('Structured audit logging', () => {
  beforeEach(() => { clearAuditEntries(); });

  describe('Auth failures', () => {
    it('logs login failure for unknown user', async () => {
      const svc = new AuthService(new UserRepositoryIDB(), new AuthRepositoryLS());
      try { await svc.login('nobody', 'pass'); } catch { /* expected */ }
      const entries = getAuditEntries();
      const e = entries.find(e => e.event === 'login_failed');
      expect(e).toBeDefined();
      expect(e!.category).toBe('auth');
      expect(e!.severity).toBe('warn');
      expect(e!.detail).toContain('unknown_user');
    });

    it('logs login failure for bad password', async () => {
      const svc = new AuthService(new UserRepositoryIDB(), new AuthRepositoryLS());
      await svc.register('user1', 'pass1234', 'dispatcher', 'U');
      try { await svc.login('user1', 'wrong'); } catch { /* expected */ }
      const e = getAuditEntries().find(e => e.event === 'login_failed');
      expect(e).toBeDefined();
      expect(e!.detail).toContain('bad_password');
      // Password should NOT appear in the log
      expect(e!.detail).not.toContain('wrong');
    });

    it('logs session validation failure with tampered role', async () => {
      const authRepo = new AuthRepositoryLS();
      const svc = new AuthService(new UserRepositoryIDB(), authRepo);
      await svc.register('target', 'pass1234', 'dispatcher', 'T');
      const session = await svc.login('target', 'pass1234');
      authRepo.saveSession({ ...session, role: 'administrator' });
      await svc.validateSession();
      const e = getAuditEntries().find(e => e.event === 'session_validation_failed');
      expect(e).toBeDefined();
      expect(e!.severity).toBe('error');
      expect(e!.detail).toContain('role_mismatch');
    });

    it('logs session validation failure with tampered HMAC', async () => {
      const authRepo = new AuthRepositoryLS();
      const svc = new AuthService(new UserRepositoryIDB(), authRepo);
      await svc.register('target2', 'pass1234', 'reviewer', 'T2');
      const session = await svc.login('target2', 'pass1234');
      authRepo.saveSession({ ...session, integrity: 'bad' });
      await svc.validateSession();
      const e = getAuditEntries().find(e => e.event === 'session_validation_failed');
      expect(e!.detail).toContain('integrity_hmac_mismatch');
    });

    it('redacts sensitive fields in audit entries', async () => {
      const svc = new AuthService(new UserRepositoryIDB(), new AuthRepositoryLS());
      await svc.register('redact', 'secret123', 'dispatcher', 'R');
      const entries = getAuditEntries();
      for (const e of entries) {
        if (e.detail) {
          expect(e.detail).not.toContain('secret123');
        }
      }
    });
  });

  describe('Import tamper detection', () => {
    it('logs tamper detection on import', async () => {
      const svc = new ExportImportService();
      const bundle: ExportBundle = {
        manifest: { version: '3.0.0', exportedAt: '', fingerprint: 'wrong', stores: [], recordCounts: {} },
        data: { venues: [{ id: 'v', name: 'X', rows: 1, seatsPerRow: 1 }] },
      };
      try {
        await svc.importFromJson(new File([JSON.stringify(bundle)], 'f.json', { type: 'application/json' }));
      } catch { /* expected */ }
      const e = getAuditEntries().find(e => e.event === 'tamper_detected');
      expect(e).toBeDefined();
      expect(e!.severity).toBe('error');
      expect(e!.category).toBe('import');
    });
  });

  describe('Notification retry/dead-letter transitions', () => {
    it('logs retry and dead-letter events', async () => {
      const notifSvc = new NotificationService(
        new NotificationRepositoryIDB(),
        new NotificationTemplateRepositoryIDB(),
        new NotificationSubscriptionRepositoryIDB()
      );
      const actor: NotificationActor = { userId: 'u1', role: 'dispatcher' };
      const n = await notifSvc.send('u1', 'tpl', { subject: 'S', body: 'B' });
      await notifSvc.fail(n.id, actor);

      clearAuditEntries();
      await notifSvc.processRetries();

      const retryEntry = getAuditEntries().find(e => e.event === 'retry');
      expect(retryEntry).toBeDefined();
      expect(retryEntry!.category).toBe('notification');
      expect(retryEntry!.actor).toBe('u1');
    });
  });
});

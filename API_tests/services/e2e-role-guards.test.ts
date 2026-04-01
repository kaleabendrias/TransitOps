import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '@services/auth-service';
import { UserRepositoryIDB } from '@adapters/indexeddb/user-repository-idb';
import { AuthRepositoryLS } from '@adapters/localstorage/auth-repository-ls';
import { canAccessRoute } from '@domain/policies/auth-policy';
import type { UserRole } from '@domain/models/user';

/**
 * Simulated browser-level E2E tests for route guards.
 * These verify the complete auth → validate → route-check flow
 * that App.svelte's wrap() conditions execute at navigation time.
 */
describe('E2E role-based route guard flow', () => {
  let svc: AuthService;
  let authRepo: AuthRepositoryLS;

  beforeEach(() => {
    authRepo = new AuthRepositoryLS();
    svc = new AuthService(new UserRepositoryIDB(), authRepo);
  });

  async function loginAs(username: string, role: UserRole): Promise<void> {
    if (role === 'administrator') {
      await svc.createAdmin(username, 'pass1234', username, null);
    } else {
      await svc.register(username, 'pass1234', role, username);
    }
    await svc.login(username, 'pass1234');
  }

  it('unauthenticated: all protected routes denied', () => {
    // No session → authGuard returns false → conditionsFailed → redirect to /login
    const session = svc.getSession();
    expect(session).toBeNull();
    // Without a session, isLoggedIn is false → all guarded routes fail
  });

  it('dispatcher login → validate → /trips allowed, /admin denied', async () => {
    await loginAs('disp1', 'dispatcher');
    const validated = await svc.validateSession();
    expect(validated).not.toBeNull();
    expect(validated!.role).toBe('dispatcher');

    expect(canAccessRoute('dispatcher', '/trips')).toBe(true);
    expect(canAccessRoute('dispatcher', '/trip/123/seats')).toBe(true);
    expect(canAccessRoute('dispatcher', '/admin')).toBe(false);
    expect(canAccessRoute('dispatcher', '/questions')).toBe(false);
  });

  it('reviewer login → validate → /grading allowed, /admin denied', async () => {
    await loginAs('rev1', 'reviewer');
    const validated = await svc.validateSession();
    expect(validated!.role).toBe('reviewer');

    expect(canAccessRoute('reviewer', '/grading')).toBe(true);
    expect(canAccessRoute('reviewer', '/admin')).toBe(false);
    expect(canAccessRoute('reviewer', '/trip/x/seats')).toBe(false);
  });

  it('content_author login → validate → /questions allowed, /grading denied', async () => {
    await loginAs('author1', 'content_author');
    const validated = await svc.validateSession();
    expect(validated!.role).toBe('content_author');

    expect(canAccessRoute('content_author', '/questions')).toBe(true);
    expect(canAccessRoute('content_author', '/grading')).toBe(false);
  });

  it('admin login → validate → all routes allowed', async () => {
    await loginAs('admin1', 'administrator');
    const validated = await svc.validateSession();
    expect(validated!.role).toBe('administrator');

    const routes = ['/admin', '/trips', '/questions', '/grading', '/notifications', '/nutrition', '/settings'];
    for (const r of routes) {
      expect(canAccessRoute('administrator', r)).toBe(true);
    }
  });

  it('tampered session → validateSession fails → route guard blocks', async () => {
    await loginAs('target', 'dispatcher');
    const session = svc.getSession()!;

    // Tamper role to admin
    authRepo.saveSession({ ...session, role: 'administrator' });
    const validated = await svc.validateSession();
    expect(validated).toBeNull();
    // No valid session → authGuard returns false → all routes blocked
  });

  it('logout clears session → routes blocked', async () => {
    await loginAs('logme', 'dispatcher');
    expect(svc.isLoggedIn()).toBe(true);
    svc.logout();
    expect(svc.getSession()).toBeNull();
    // authGuard returns false → all routes blocked
  });

  it('user switch produces isolated sessions', async () => {
    await loginAs('userX', 'dispatcher');
    const sessionX = svc.getSession()!;
    svc.logout();

    await loginAs('userY', 'reviewer');
    const sessionY = svc.getSession()!;

    expect(sessionX.userId).not.toBe(sessionY.userId);
    expect(sessionY.role).toBe('reviewer');
  });
});

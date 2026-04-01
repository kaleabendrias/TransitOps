import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '@services/auth-service';
import { UserRepositoryIDB } from '@adapters/indexeddb/user-repository-idb';
import { AuthRepositoryLS } from '@adapters/localstorage/auth-repository-ls';
import type { AuthSession } from '@domain/ports/auth-repository';

describe('Session tamper detection and IDB rehydration', () => {
  let svc: AuthService;
  let authRepo: AuthRepositoryLS;

  beforeEach(() => {
    authRepo = new AuthRepositoryLS();
    svc = new AuthService(new UserRepositoryIDB(), authRepo);
  });

  it('validateSession returns valid session after login', async () => {
    await svc.register('alice', 'pass1234', 'dispatcher', 'Alice');
    await svc.login('alice', 'pass1234');
    const validated = await svc.validateSession();
    expect(validated).not.toBeNull();
    expect(validated!.username).toBe('alice');
    expect(validated!.role).toBe('dispatcher');
  });

  it('validateSession rejects session with tampered role', async () => {
    await svc.register('bob', 'pass1234', 'reviewer', 'Bob');
    const session = await svc.login('bob', 'pass1234');

    // Tamper: change role in localStorage
    const tampered: AuthSession = { ...session, role: 'administrator' };
    authRepo.saveSession(tampered);

    const validated = await svc.validateSession();
    expect(validated).toBeNull();
  });

  it('validateSession rejects session with tampered userId', async () => {
    await svc.register('carol', 'pass1234', 'dispatcher', 'Carol');
    const session = await svc.login('carol', 'pass1234');

    const tampered: AuthSession = { ...session, userId: 'nonexistent-id' };
    authRepo.saveSession(tampered);

    const validated = await svc.validateSession();
    expect(validated).toBeNull();
  });

  it('validateSession rejects session with tampered integrity HMAC', async () => {
    await svc.register('dave', 'pass1234', 'content_author', 'Dave');
    const session = await svc.login('dave', 'pass1234');

    const tampered: AuthSession = { ...session, integrity: 'deadbeef0000' };
    authRepo.saveSession(tampered);

    const validated = await svc.validateSession();
    expect(validated).toBeNull();
  });

  it('validateSession clears localStorage on tamper detection', async () => {
    await svc.register('eve', 'pass1234', 'dispatcher', 'Eve');
    const session = await svc.login('eve', 'pass1234');

    authRepo.saveSession({ ...session, role: 'administrator' });
    await svc.validateSession();

    expect(authRepo.getSession()).toBeNull();
  });

  it('session integrity field is present after login', async () => {
    await svc.register('frank', 'pass1234', 'dispatcher', 'Frank');
    const session = await svc.login('frank', 'pass1234');
    expect(session.integrity).toBeTruthy();
    expect(session.integrity.length).toBeGreaterThan(10);
  });

  it('getUserKeyMaterial returns password hash for crypto derivation', async () => {
    const user = await svc.register('grace', 'pass1234', 'reviewer', 'Grace');
    const km = await svc.getUserKeyMaterial(user.id);
    expect(km).toBeTruthy();
    expect(km!.length).toBeGreaterThan(10);
  });

  it('getUserKeyMaterial returns null for unknown user', async () => {
    const km = await svc.getUserKeyMaterial('nonexistent');
    expect(km).toBeNull();
  });
});

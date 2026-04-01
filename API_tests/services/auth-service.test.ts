import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '@services/auth-service';
import { UserRepositoryIDB } from '@adapters/indexeddb/user-repository-idb';
import { AuthRepositoryLS } from '@adapters/localstorage/auth-repository-ls';

describe('AuthService', () => {
  let svc: AuthService;

  beforeEach(() => { svc = new AuthService(new UserRepositoryIDB(), new AuthRepositoryLS()); });

  it('registers with redacted result (no passwordHash/salt)', async () => {
    const user = await svc.register('alice', 'pass1234', 'dispatcher', 'Alice');
    expect(user.username).toBe('alice');
    expect(user.role).toBe('dispatcher');
    expect('passwordHash' in user).toBe(false);
    expect('salt' in user).toBe(false);
  });

  it('rejects duplicate username', async () => {
    await svc.register('bob', 'pass1234', 'dispatcher', 'Bob');
    await expect(svc.register('bob', 'pass5678', 'reviewer', 'Bob2')).rejects.toThrow('already taken');
  });

  it('rejects short password', async () => {
    await expect(svc.register('x', '123', 'dispatcher', 'X')).rejects.toThrow('at least 4');
  });

  it('login succeeds', async () => {
    await svc.createAdmin('carol', 'mypass', 'Carol', null);
    const session = await svc.login('carol', 'mypass');
    expect(session.username).toBe('carol');
    expect(session.role).toBe('administrator');
  });

  it('login fails with wrong password', async () => {
    await svc.register('dave', 'correct', 'reviewer', 'Dave');
    await expect(svc.login('dave', 'wrong')).rejects.toThrow('Invalid');
  });

  it('login fails with unknown user', async () => {
    await expect(svc.login('nobody', 'pass')).rejects.toThrow('Invalid');
  });

  it('logout clears session', async () => {
    await svc.register('eve', 'pass1234', 'dispatcher', 'Eve');
    await svc.login('eve', 'pass1234');
    expect(svc.isLoggedIn()).toBe(true);
    svc.logout();
    expect(svc.isLoggedIn()).toBe(false);
  });

  it('getUser returns redacted user', async () => {
    const user = await svc.register('frank', 'pass1234', 'content_author', 'Frank');
    const fetched = await svc.getUser(user.id);
    expect(fetched!.username).toBe('frank');
    expect('passwordHash' in fetched!).toBe(false);
  });

  it('listUsers requires admin session', async () => {
    await svc.register('g', 'pass1234', 'dispatcher', 'G');
    const session = await svc.login('g', 'pass1234');
    await expect(svc.listUsers(session)).rejects.toThrow('Only administrators');
  });

  it('listUsers returns redacted users for admin', async () => {
    await svc.createAdmin('adm', 'pass1234', 'Adm', null);
    await svc.register('h', 'pass1234', 'reviewer', 'H');
    const session = await svc.login('adm', 'pass1234');
    const users = await svc.listUsers(session);
    expect(users.length).toBe(2);
    expect(users.every(u => !('passwordHash' in u))).toBe(true);
  });
});

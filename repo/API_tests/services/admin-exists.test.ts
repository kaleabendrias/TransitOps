import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '@services/auth-service';
import { UserRepositoryIDB } from '@adapters/indexeddb/user-repository-idb';
import { AuthRepositoryLS } from '@adapters/localstorage/auth-repository-ls';

describe('AuthService.adminExists', () => {
  let svc: AuthService;

  beforeEach(() => {
    svc = new AuthService(new UserRepositoryIDB(), new AuthRepositoryLS());
  });

  it('returns false on empty database', async () => {
    const result = await svc.adminExists();
    expect(result).toBe(false);
  });

  it('returns false when only non-admin users exist', async () => {
    await svc.register('dispatcher1', 'pass1234', 'dispatcher', 'Dispatcher One');
    const result = await svc.adminExists();
    expect(result).toBe(false);
  });

  it('returns true after creating an admin', async () => {
    await svc.createAdmin('admin1', 'pass1234', 'Admin One', null);
    const result = await svc.adminExists();
    expect(result).toBe(true);
  });

  it('returns true when admin is one of multiple users', async () => {
    await svc.register('dispatcher2', 'pass1234', 'dispatcher', 'Dispatcher Two');
    await svc.createAdmin('admin2', 'pass1234', 'Admin Two', null);
    await svc.register('reviewer1', 'pass1234', 'reviewer', 'Reviewer One');
    const result = await svc.adminExists();
    expect(result).toBe(true);
  });
});

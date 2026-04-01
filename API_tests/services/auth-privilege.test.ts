import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '@services/auth-service';
import { UserRepositoryIDB } from '@adapters/indexeddb/user-repository-idb';
import { AuthRepositoryLS } from '@adapters/localstorage/auth-repository-ls';

describe('Registration privilege escalation prevention', () => {
  let svc: AuthService;

  beforeEach(() => {
    svc = new AuthService(new UserRepositoryIDB(), new AuthRepositoryLS());
  });

  it('rejects administrator role via public register()', async () => {
    await expect(svc.register('hacker', 'pass1234', 'administrator', 'Hacker'))
      .rejects.toThrow('cannot be self-assigned');
  });

  it('allows dispatcher via register()', async () => {
    const u = await svc.register('disp', 'pass1234', 'dispatcher', 'D');
    expect(u.role).toBe('dispatcher');
  });

  it('allows content_author via register()', async () => {
    const u = await svc.register('ca', 'pass1234', 'content_author', 'CA');
    expect(u.role).toBe('content_author');
  });

  it('allows reviewer via register()', async () => {
    const u = await svc.register('rev', 'pass1234', 'reviewer', 'R');
    expect(u.role).toBe('reviewer');
  });

  it('bootstrap: createAdmin succeeds when no admins exist', async () => {
    const u = await svc.createAdmin('admin1', 'pass1234', 'Admin', null);
    expect(u.role).toBe('administrator');
  });

  it('bootstrap: createAdmin fails without session when admin exists', async () => {
    await svc.createAdmin('admin1', 'pass1234', 'Admin', null);
    await expect(svc.createAdmin('admin2', 'pass1234', 'Admin2', null))
      .rejects.toThrow('Administrator already exists');
  });

  it('admin can create another admin', async () => {
    const admin1 = await svc.createAdmin('admin1', 'pass1234', 'Admin1', null);
    const session = await svc.login('admin1', 'pass1234');
    const admin2 = await svc.createAdmin('admin2', 'pass5678', 'Admin2', session);
    expect(admin2.role).toBe('administrator');
  });

  it('non-admin session cannot create admin', async () => {
    await svc.createAdmin('admin1', 'pass1234', 'Admin', null);
    await svc.register('disp', 'pass1234', 'dispatcher', 'D');
    const session = await svc.login('disp', 'pass1234');
    await expect(svc.createAdmin('admin3', 'pass1234', 'Fake', session))
      .rejects.toThrow('Only administrators');
  });

  it('crafted payload with administrator role still rejected at service layer', async () => {
    // Simulating what a crafted request would do — calling register with 'administrator'
    await expect(svc.register('bypass', 'pass1234', 'administrator', 'Bypass'))
      .rejects.toThrow('cannot be self-assigned');
  });
});

import { describe, it, expect } from 'vitest';
import { createUser, recordLogin, ROLE_LABELS, ALL_ROLES } from '@domain/models/user';

describe('User Model', () => {
  it('creates with lowercased trimmed username', () => {
    const u = createUser({ username: '  Admin ', passwordHash: 'h', salt: 's', role: 'administrator', displayName: 'Admin' });
    expect(u.username).toBe('admin');
    expect(u.role).toBe('administrator');
    expect(u.displayName).toBe('Admin');
    expect(u.lastLoginAt).toBeNull();
    expect(u.id).toBeTruthy();
  });

  it('recordLogin sets lastLoginAt immutably', () => {
    const u = createUser({ username: 'u', passwordHash: 'h', salt: 's', role: 'dispatcher', displayName: 'U' });
    const logged = recordLogin(u);
    expect(logged.lastLoginAt).toBeGreaterThan(0);
    expect(u.lastLoginAt).toBeNull();
    expect(logged.updatedAt).toBeGreaterThanOrEqual(u.updatedAt);
  });

  it('ALL_ROLES has 4 roles', () => {
    expect(ALL_ROLES).toHaveLength(4);
    expect(ALL_ROLES).toContain('administrator');
    expect(ALL_ROLES).toContain('dispatcher');
    expect(ALL_ROLES).toContain('content_author');
    expect(ALL_ROLES).toContain('reviewer');
  });

  it('ROLE_LABELS maps all roles', () => {
    for (const r of ALL_ROLES) expect(ROLE_LABELS[r]).toBeTruthy();
  });
});

import { describe, it, expect } from 'vitest';
import { canAccessRoute, hasPermission } from '@domain/policies/auth-policy';
import type { UserRole } from '@domain/models/user';

describe('RBAC Route Denial', () => {
  const denials: [UserRole, string][] = [
    ['dispatcher', '/admin'],
    ['dispatcher', '/questions'],
    ['dispatcher', '/grading'],
    ['content_author', '/admin'],
    ['content_author', '/trip/123/seats'],
    ['reviewer', '/admin'],
    ['reviewer', '/questions'],
    ['reviewer', '/trip/abc/seats'],
  ];
  for (const [role, path] of denials) {
    it(`${role} is denied ${path}`, () => expect(canAccessRoute(role, path)).toBe(false));
  }

  const grants: [UserRole, string][] = [
    ['administrator', '/admin'],
    ['administrator', '/questions'],
    ['administrator', '/grading'],
    ['administrator', '/trips'],
    ['administrator', '/notifications'],
    ['administrator', '/nutrition'],
    ['dispatcher', '/trips'],
    ['dispatcher', '/trip/x/seats'],
    ['dispatcher', '/notifications'],
    ['content_author', '/questions'],
    ['content_author', '/notifications'],
    ['reviewer', '/grading'],
    ['reviewer', '/notifications'],
  ];
  for (const [role, path] of grants) {
    it(`${role} is allowed ${path}`, () => expect(canAccessRoute(role, path)).toBe(true));
  }

  it('dispatcher lacks manage_users', () => expect(hasPermission('dispatcher', 'manage_users')).toBe(false));
  it('reviewer lacks manage_questions', () => expect(hasPermission('reviewer', 'manage_questions')).toBe(false));
  it('content_author lacks manage_seats', () => expect(hasPermission('content_author', 'manage_seats')).toBe(false));
});

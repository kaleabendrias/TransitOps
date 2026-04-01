import { describe, it, expect } from 'vitest';
import { hasPermission, getPermissions, canAccessRoute } from '@domain/policies/auth-policy';
import type { UserRole } from '@domain/models/user';

describe('Auth Policy', () => {
  describe('hasPermission', () => {
    const cases: [UserRole, string, boolean][] = [
      ['administrator', 'manage_users', true],
      ['administrator', 'manage_trips', true],
      ['administrator', 'export_data', true],
      ['dispatcher', 'manage_trips', true],
      ['dispatcher', 'hold_seats', true],
      ['dispatcher', 'view_notifications', true],
      ['dispatcher', 'manage_users', false],
      ['dispatcher', 'manage_content', false],
      ['content_author', 'manage_questions', true],
      ['content_author', 'manage_catalogs', true],
      ['content_author', 'manage_trips', false],
      ['reviewer', 'review_attempts', true],
      ['reviewer', 'grade_attempts', true],
      ['reviewer', 'view_grades', true],
      ['reviewer', 'manage_trips', false],
    ];
    for (const [role, perm, expected] of cases) {
      it(`${role} ${expected ? 'has' : 'lacks'} ${perm}`, () => expect(hasPermission(role, perm as any)).toBe(expected));
    }
  });

  describe('getPermissions', () => {
    it('admin has most permissions', () => expect(getPermissions('administrator').length).toBeGreaterThan(10));
    it('dispatcher has 6', () => expect(getPermissions('dispatcher').length).toBe(6));
    it('content_author includes manage_questions', () => expect(getPermissions('content_author')).toContain('manage_questions'));
    it('reviewer includes grade_attempts', () => expect(getPermissions('reviewer')).toContain('grade_attempts'));
  });

  describe('canAccessRoute', () => {
    it('dispatcher can access /trips', () => expect(canAccessRoute('dispatcher', '/trips')).toBe(true));
    it('dispatcher can access /trip/123/seats', () => expect(canAccessRoute('dispatcher', '/trip/123/seats')).toBe(true));
    it('reviewer cannot access /trip/123/seats', () => expect(canAccessRoute('reviewer', '/trip/123/seats')).toBe(false));
    it('everyone can access /settings', () => {
      for (const role of ['dispatcher', 'reviewer', 'content_author', 'administrator'] as UserRole[]) {
        expect(canAccessRoute(role, '/settings')).toBe(true);
      }
    });
    it('only admin can access /admin', () => {
      expect(canAccessRoute('administrator', '/admin')).toBe(true);
      expect(canAccessRoute('dispatcher', '/admin')).toBe(false);
    });
    it('unknown routes default to allowed', () => expect(canAccessRoute('reviewer', '/unknown')).toBe(true));
  });
});

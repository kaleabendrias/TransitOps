import type { UserRole } from '../models/user';

export type Permission =
  | 'manage_users'
  | 'manage_trips'
  | 'manage_seats'
  | 'hold_seats'
  | 'view_trips'
  | 'manage_content'
  | 'manage_questions'
  | 'review_attempts'
  | 'grade_attempts'
  | 'view_grades'
  | 'manage_catalogs'
  | 'manage_settings'
  | 'manage_associations'
  | 'view_notifications'
  | 'manage_nutrition'
  | 'export_data';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  administrator: [
    'manage_users', 'manage_trips', 'manage_seats', 'hold_seats',
    'view_trips', 'manage_content', 'manage_questions',
    'review_attempts', 'grade_attempts', 'view_grades',
    'manage_catalogs', 'manage_settings', 'manage_associations',
    'view_notifications', 'manage_nutrition', 'export_data',
  ],
  dispatcher: [
    'manage_trips', 'manage_seats', 'hold_seats', 'view_trips',
    'view_notifications', 'manage_nutrition',
  ],
  content_author: [
    'manage_content', 'manage_questions', 'manage_catalogs',
    'view_trips', 'view_notifications', 'manage_nutrition',
  ],
  reviewer: [
    'review_attempts', 'grade_attempts', 'view_grades',
    'view_trips', 'view_notifications', 'manage_nutrition',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export interface RouteAccess {
  path: string;
  requiredPermissions: Permission[];
}

export const ROUTE_ACCESS: RouteAccess[] = [
  { path: '/trips', requiredPermissions: ['view_trips'] },
  { path: '/trips/new', requiredPermissions: ['manage_trips'] },
  { path: '/trip/:id/seats', requiredPermissions: ['manage_seats'] },
  { path: '/questions', requiredPermissions: ['manage_questions'] },
  { path: '/grading', requiredPermissions: ['review_attempts'] },
  { path: '/catalogs', requiredPermissions: ['manage_catalogs'] },
  { path: '/admin', requiredPermissions: ['manage_users'] },
  { path: '/notifications', requiredPermissions: ['view_notifications'] },
  { path: '/nutrition', requiredPermissions: ['manage_nutrition'] },
  { path: '/settings', requiredPermissions: [] },
];

function routePatternMatches(pattern: string, path: string): boolean {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((part, i) =>
    part.startsWith(':') || part === pathParts[i]
  );
}

export function canAccessRoute(role: UserRole, path: string): boolean {
  const sorted = [...ROUTE_ACCESS].sort((a, b) => b.path.length - a.path.length);
  const route = sorted.find((r) => routePatternMatches(r.path, path));
  if (!route) return true;
  if (route.requiredPermissions.length === 0) return true;
  return route.requiredPermissions.every((p) => hasPermission(role, p));
}

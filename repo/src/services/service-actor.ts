import type { UserRole } from '@domain/models/user';
import { hasPermission, type Permission } from '@domain/policies/auth-policy';

export interface ServiceActor {
  userId: string;
  role: UserRole;
}

export function requirePermission(actor: ServiceActor, permission: Permission): void {
  if (!hasPermission(actor.role, permission)) {
    throw new Error(`Access denied: requires "${permission}" permission`);
  }
}

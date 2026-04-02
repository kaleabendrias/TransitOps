export type UserRole = 'administrator' | 'dispatcher' | 'content_author' | 'reviewer';

export interface User {
  readonly id: string;
  readonly username: string;
  readonly passwordHash: string;
  readonly salt: string;
  readonly role: UserRole;
  readonly displayName: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastLoginAt: number | null;
}

export function createUser(params: {
  username: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  displayName: string;
}): User {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    username: params.username.toLowerCase().trim(),
    passwordHash: params.passwordHash,
    salt: params.salt,
    role: params.role,
    displayName: params.displayName,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };
}

export function recordLogin(user: User): User {
  return { ...user, lastLoginAt: Date.now(), updatedAt: Date.now() };
}

export const ROLE_LABELS: Record<UserRole, string> = {
  administrator: 'Administrator',
  dispatcher: 'Dispatcher',
  content_author: 'Content Author',
  reviewer: 'Reviewer / Grader',
};

export const ALL_ROLES: UserRole[] = ['administrator', 'dispatcher', 'content_author', 'reviewer'];

/** User object with credential fields stripped. Safe for UI/API consumption. */
export interface SafeUser {
  readonly id: string;
  readonly username: string;
  readonly role: UserRole;
  readonly displayName: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastLoginAt: number | null;
}

export function redactUser(user: User): SafeUser {
  return {
    id: user.id, username: user.username, role: user.role,
    displayName: user.displayName, createdAt: user.createdAt,
    updatedAt: user.updatedAt, lastLoginAt: user.lastLoginAt,
  };
}

/** Roles available for public self-registration (excludes administrator). */
export const PUBLIC_REGISTRATION_ROLES: UserRole[] = ['dispatcher', 'content_author', 'reviewer'];

import { writable, derived } from 'svelte/store';
import type { AuthSession } from '@domain/ports/auth-repository';
import type { UserRole } from '@domain/models/user';
import { hasPermission, type Permission } from '@domain/policies/auth-policy';
import { authService, cryptoStorageService, preferencesService } from '@services/container';
import { reloadPreferences, resetPreferences } from './preferences-store';

export const session = writable<AuthSession | null>(null);
export const authLoading = writable(false);
export const authError = writable<string | null>(null);
export const sessionReady = writable(false);

export const isLoggedIn = derived(session, ($s) => $s !== null);
export const currentRole = derived(session, ($s) => ($s?.role as UserRole) ?? null);
export const currentUserId = derived(session, ($s) => $s?.userId ?? null);

export function checkPermission(role: UserRole | null, permission: Permission): boolean {
  if (!role) return false;
  return hasPermission(role, permission);
}

function activateUserContext(s: AuthSession, keyMaterial: string | null): void {
  preferencesService.setCurrentUser(s.userId);
  if (keyMaterial) cryptoStorageService.setKeyMaterial(keyMaterial);
  reloadPreferences();
}

function clearUserContext(): void {
  resetPreferences();
  preferencesService.setCurrentUser(undefined);
  cryptoStorageService.clearKeyMaterial();
}

export async function rehydrateSession() {
  const validated = await authService.validateSession();
  if (validated) {
    const km = await authService.getUserKeyMaterial(validated.userId);
    activateUserContext(validated, km);
    session.set(validated);
  } else {
    clearUserContext();
    session.set(null);
  }
  sessionReady.set(true);
}

export async function login(username: string, password: string) {
  authLoading.set(true);
  authError.set(null);
  try {
    const s = await authService.login(username, password);
    const km = await authService.getUserKeyMaterial(s.userId);
    activateUserContext(s, km);
    session.set(s);
  } catch (e) {
    authError.set(e instanceof Error ? e.message : 'Login failed');
    throw e;
  } finally {
    authLoading.set(false);
  }
}

export async function register(
  username: string,
  password: string,
  role: UserRole,
  displayName: string
) {
  authLoading.set(true);
  authError.set(null);
  try {
    await authService.register(username, password, role, displayName);
    const s = await authService.login(username, password);
    const km = await authService.getUserKeyMaterial(s.userId);
    activateUserContext(s, km);
    session.set(s);
  } catch (e) {
    authError.set(e instanceof Error ? e.message : 'Registration failed');
    throw e;
  } finally {
    authLoading.set(false);
  }
}

export function logout() {
  authService.logout();
  clearUserContext();
  session.set(null);
}

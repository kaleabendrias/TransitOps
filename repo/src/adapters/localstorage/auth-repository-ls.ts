import type { AuthRepository, AuthSession } from '@domain/ports/auth-repository';
import { config } from '@config/index';

const SESSION_KEY = `${config.storage.localStoragePrefix}session`;

export class AuthRepositoryLS implements AuthRepository {
  getSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  }

  saveSession(session: AuthSession): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  }
}

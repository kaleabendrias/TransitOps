export interface AuthSession {
  userId: string;
  username: string;
  role: string;
  loginAt: number;
  /** HMAC of userId+role+loginAt, computed at login time using the user's password hash as key. */
  integrity: string;
}

export interface AuthRepository {
  getSession(): AuthSession | null;
  saveSession(session: AuthSession): void;
  clearSession(): void;
}

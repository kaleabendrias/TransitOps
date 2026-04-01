import type { UserRole, SafeUser } from '@domain/models/user';
import { createUser, recordLogin, redactUser, PUBLIC_REGISTRATION_ROLES } from '@domain/models/user';
import type { UserRepository } from '@domain/ports/user-repository';
import type { AuthRepository, AuthSession } from '@domain/ports/auth-repository';
import { generateSalt, hashPassword, verifyPassword } from './crypto-utils';
import { auditLog } from './audit-log';

export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authRepo: AuthRepository
  ) {}

  async register(
    username: string,
    password: string,
    role: UserRole,
    displayName: string
  ): Promise<SafeUser> {
    if (!PUBLIC_REGISTRATION_ROLES.includes(role)) {
      throw new Error(`Role "${role}" cannot be self-assigned during registration`);
    }
    return redactUser(await this.createUserInternal(username, password, role, displayName));
  }

  async createAdmin(
    username: string,
    password: string,
    displayName: string,
    callerSession: AuthSession | null
  ): Promise<SafeUser> {
    if (!callerSession) {
      const users = await this.userRepo.getAll();
      if (users.some((u) => u.role === 'administrator')) {
        throw new Error('Administrator already exists; only an admin can create another admin');
      }
    } else if (callerSession.role !== 'administrator') {
      throw new Error('Only administrators can create administrator accounts');
    }
    return redactUser(await this.createUserInternal(username, password, 'administrator', displayName));
  }

  private async createUserInternal(
    username: string,
    password: string,
    role: UserRole,
    displayName: string
  ) {
    const existing = await this.userRepo.getByUsername(username);
    if (existing) throw new Error(`Username "${username}" is already taken`);
    if (password.length < 4) throw new Error('Password must be at least 4 characters');

    const salt = generateSalt();
    const pw = await hashPassword(password, salt);
    const user = createUser({ username, passwordHash: pw, salt, role, displayName });
    await this.userRepo.save(user);
    return user;
  }

  async login(username: string, password: string): Promise<AuthSession> {
    const user = await this.userRepo.getByUsername(username);
    if (!user) {
      auditLog('warn', 'auth', 'login_failed', { username, reason: 'unknown_user' });
      throw new Error('Invalid username or password');
    }
    const valid = await verifyPassword(password, user.salt, user.passwordHash);
    if (!valid) {
      auditLog('warn', 'auth', 'login_failed', { username, reason: 'bad_password' });
      throw new Error('Invalid username or password');
    }

    await this.userRepo.save(recordLogin(user));
    const loginAt = Date.now();
    const integrity = await this.computeIntegrity(user.id, user.role, loginAt, user.passwordHash);
    const session: AuthSession = { userId: user.id, username: user.username, role: user.role, loginAt, integrity };
    this.authRepo.saveSession(session);
    return session;
  }

  async validateSession(): Promise<AuthSession | null> {
    const session = this.authRepo.getSession();
    if (!session) return null;
    const user = await this.userRepo.getById(session.userId);
    if (!user || user.role !== session.role) {
      auditLog('error', 'auth', 'session_validation_failed', { userId: session.userId, reason: !user ? 'user_not_found' : 'role_mismatch' });
      this.authRepo.clearSession();
      return null;
    }
    const expected = await this.computeIntegrity(session.userId, session.role, session.loginAt, user.passwordHash);
    if (expected !== session.integrity) {
      auditLog('error', 'auth', 'session_validation_failed', { userId: session.userId, reason: 'integrity_hmac_mismatch' });
      this.authRepo.clearSession();
      return null;
    }
    return session;
  }

  logout(): void { this.authRepo.clearSession(); }
  getSession(): AuthSession | null { return this.authRepo.getSession(); }
  isLoggedIn(): boolean { return this.authRepo.getSession() !== null; }

  async getUser(userId: string): Promise<SafeUser | null> {
    const user = await this.userRepo.getById(userId);
    return user ? redactUser(user) : null;
  }

  async listUsers(callerSession: AuthSession): Promise<SafeUser[]> {
    if (callerSession.role !== 'administrator') {
      throw new Error('Only administrators can list users');
    }
    return (await this.userRepo.getAll()).map(redactUser);
  }

  /** @internal Key material for CryptoStorageService — never exposed via public exports. */
  async getUserKeyMaterial(userId: string): Promise<string | null> {
    const user = await this.userRepo.getById(userId);
    return user?.passwordHash ?? null;
  }

  private async computeIntegrity(userId: string, role: string, loginAt: number, passwordHash: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(passwordHash), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${userId}:${role}:${loginAt}`));
    return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

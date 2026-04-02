import { describe, it, expect, beforeEach } from 'vitest';
import { PreferencesRepositoryLS } from '@adapters/localstorage/preferences-repository-ls';
import { AuthRepositoryLS } from '@adapters/localstorage/auth-repository-ls';
import { DEFAULT_PREFERENCES } from '@domain/ports/preferences-repository';

describe('PreferencesRepositoryLS', () => {
  let repo: PreferencesRepositoryLS;

  beforeEach(() => { localStorage.clear(); repo = new PreferencesRepositoryLS(); });

  it('returns defaults when empty', () => {
    const p = repo.get();
    expect(p.theme).toBe(DEFAULT_PREFERENCES.theme);
    expect(p.uiLanguage).toBe('en');
    expect(p.quietHours.start).toBe('21:00');
  });

  it('saves and retrieves', () => {
    const prefs = { ...DEFAULT_PREFERENCES, theme: 'dark' as const, lastFilter: 'test' };
    repo.save(prefs);
    const loaded = repo.get();
    expect(loaded.theme).toBe('dark');
    expect(loaded.lastFilter).toBe('test');
  });

  it('merges with defaults for missing fields', () => {
    localStorage.setItem('to_preferences', JSON.stringify({ theme: 'dark' }));
    const p = repo.get();
    expect(p.theme).toBe('dark');
    expect(p.uiLanguage).toBe('en'); // default
    expect(p.quietHours.enabled).toBe(true); // nested default
  });

  it('handles corrupt JSON gracefully', () => {
    localStorage.setItem('to_preferences', 'not-json');
    const p = repo.get();
    expect(p.theme).toBe('light');
  });
});

describe('AuthRepositoryLS', () => {
  let repo: AuthRepositoryLS;

  beforeEach(() => { localStorage.clear(); repo = new AuthRepositoryLS(); });

  it('returns null initially', () => expect(repo.getSession()).toBeNull());

  it('saves and retrieves session', () => {
    repo.saveSession({ userId: 'u1', username: 'test', role: 'admin', loginAt: 123 });
    const s = repo.getSession();
    expect(s).not.toBeNull();
    expect(s!.userId).toBe('u1');
  });

  it('clearSession removes session', () => {
    repo.saveSession({ userId: 'u1', username: 'test', role: 'admin', loginAt: 123 });
    repo.clearSession();
    expect(repo.getSession()).toBeNull();
  });

  it('handles corrupt JSON', () => {
    localStorage.setItem('to_session', 'bad');
    expect(repo.getSession()).toBeNull();
  });
});

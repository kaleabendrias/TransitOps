import { describe, it, expect, beforeEach } from 'vitest';
import { PreferencesService } from '@services/preferences-service';
import { PreferencesRepositoryLS } from '@adapters/localstorage/preferences-repository-ls';

describe('PreferencesService', () => {
  let svc: PreferencesService;

  beforeEach(() => {
    localStorage.clear();
    svc = new PreferencesService(new PreferencesRepositoryLS());
  });

  it('returns defaults initially', () => {
    const p = svc.getPreferences();
    expect(p.theme).toBe('light');
    expect(p.uiLanguage).toBe('en');
    expect(p.quietHours.enabled).toBe(true);
    expect(p.quietHours.start).toBe('21:00');
    expect(p.quietHours.end).toBe('07:00');
  });

  it('updates and persists preferences', () => {
    svc.updatePreferences({ theme: 'dark', lastFilter: 'active' });
    const p = svc.getPreferences();
    expect(p.theme).toBe('dark');
    expect(p.lastFilter).toBe('active');
  });

  it('toggleTheme switches between light and dark', () => {
    expect(svc.getPreferences().theme).toBe('light');
    svc.toggleTheme();
    expect(svc.getPreferences().theme).toBe('dark');
    svc.toggleTheme();
    expect(svc.getPreferences().theme).toBe('light');
  });
});

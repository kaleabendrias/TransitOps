import { describe, it, expect, beforeEach } from 'vitest';
import { PreferencesService } from '@services/preferences-service';
import { PreferencesRepositoryLS } from '@adapters/localstorage/preferences-repository-ls';
import { DEFAULT_PREFERENCES } from '@domain/ports/preferences-repository';

describe('Preferences rehydration on user switch', () => {
  let svc: PreferencesService;

  beforeEach(() => {
    localStorage.clear();
    svc = new PreferencesService(new PreferencesRepositoryLS());
  });

  it('simulates login→logout→login cycle with state isolation', () => {
    // User A logs in
    svc.setCurrentUser('userA');
    svc.updatePreferences({ theme: 'dark', lastFilter: 'active' });
    expect(svc.getPreferences().theme).toBe('dark');

    // User A logs out
    svc.setCurrentUser(undefined);
    // After logout, service returns global defaults
    expect(svc.getPreferences().theme).toBe(DEFAULT_PREFERENCES.theme);

    // User B logs in
    svc.setCurrentUser('userB');
    expect(svc.getPreferences().theme).toBe('light'); // B has defaults
    expect(svc.getPreferences().lastFilter).toBe('');
    svc.updatePreferences({ theme: 'dark', scoringThreshold: 80 });

    // User B logs out
    svc.setCurrentUser(undefined);

    // User A logs back in — sees their own state
    svc.setCurrentUser('userA');
    expect(svc.getPreferences().theme).toBe('dark');
    expect(svc.getPreferences().lastFilter).toBe('active');
    expect(svc.getPreferences().scoringThreshold).toBe(60); // A never changed this

    // User B logs back in — sees their own state
    svc.setCurrentUser('userB');
    expect(svc.getPreferences().scoringThreshold).toBe(80);
  });

  it('gradingConfig isolated per user', () => {
    svc.setCurrentUser('admin1');
    svc.updatePreferences({
      gradingConfig: { roundingIncrement: 0.25, typeWeights: { ...DEFAULT_PREFERENCES.gradingConfig.typeWeights, essay: 5.0 } },
    });

    svc.setCurrentUser('admin2');
    expect(svc.getPreferences().gradingConfig.roundingIncrement).toBe(0.5); // default
    expect(svc.getPreferences().gradingConfig.typeWeights['essay']).toBe(2.0); // default

    svc.setCurrentUser('admin1');
    expect(svc.getPreferences().gradingConfig.roundingIncrement).toBe(0.25);
    expect(svc.getPreferences().gradingConfig.typeWeights['essay']).toBe(5.0);
  });

  it('clearForUser does not affect other users', () => {
    svc.setCurrentUser('x');
    svc.updatePreferences({ theme: 'dark' });
    svc.setCurrentUser('y');
    svc.updatePreferences({ theme: 'dark' });

    svc.clearForUser('x');

    svc.setCurrentUser('x');
    expect(svc.getPreferences().theme).toBe('light'); // cleared

    svc.setCurrentUser('y');
    expect(svc.getPreferences().theme).toBe('dark'); // untouched
  });
});

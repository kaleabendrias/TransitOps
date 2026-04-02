import { describe, it, expect, beforeEach } from 'vitest';
import { PreferencesService } from '@services/preferences-service';
import { PreferencesRepositoryLS } from '@adapters/localstorage/preferences-repository-ls';

describe('Per-user scoped preferences', () => {
  let svc: PreferencesService;

  beforeEach(() => {
    localStorage.clear();
    svc = new PreferencesService(new PreferencesRepositoryLS());
  });

  it('different users get independent preferences', () => {
    svc.setCurrentUser('userA');
    svc.updatePreferences({ theme: 'dark' });

    svc.setCurrentUser('userB');
    expect(svc.getPreferences().theme).toBe('light'); // default for new user

    svc.setCurrentUser('userA');
    expect(svc.getPreferences().theme).toBe('dark'); // still dark for userA
  });

  it('user switch isolates state completely', () => {
    svc.setCurrentUser('u1');
    svc.updatePreferences({ lastFilter: 'active', scoringThreshold: 80 });

    svc.setCurrentUser('u2');
    expect(svc.getPreferences().lastFilter).toBe('');
    expect(svc.getPreferences().scoringThreshold).toBe(60);
  });

  it('clearForUser removes that user data only', () => {
    svc.setCurrentUser('u1');
    svc.updatePreferences({ theme: 'dark' });

    svc.setCurrentUser('u2');
    svc.updatePreferences({ theme: 'dark' });

    svc.clearForUser('u1');

    svc.setCurrentUser('u1');
    expect(svc.getPreferences().theme).toBe('light'); // reset to default

    svc.setCurrentUser('u2');
    expect(svc.getPreferences().theme).toBe('dark'); // still set
  });

  it('gradingConfig persists per user', () => {
    svc.setCurrentUser('admin1');
    svc.updatePreferences({
      gradingConfig: {
        roundingIncrement: 0.25,
        typeWeights: { essay: 3.0, multiple_choice: 1.0, single_choice: 1.0, true_false: 0.5, fill_in_the_blank: 1.0, short_answer: 1.5 },
      },
    });

    svc.setCurrentUser('admin1');
    const prefs = svc.getPreferences();
    expect(prefs.gradingConfig.roundingIncrement).toBe(0.25);
    expect(prefs.gradingConfig.typeWeights['essay']).toBe(3.0);
  });

  it('undefined userId falls back to global key', () => {
    svc.setCurrentUser(undefined);
    svc.updatePreferences({ theme: 'dark' });
    expect(svc.getPreferences().theme).toBe('dark');
  });
});

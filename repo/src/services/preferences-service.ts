import type { PreferencesRepository, UserPreferences } from '@domain/ports/preferences-repository';

export class PreferencesService {
  private currentUserId: string | undefined;

  constructor(private readonly prefsRepo: PreferencesRepository) {}

  setCurrentUser(userId: string | undefined): void {
    this.currentUserId = userId;
  }

  getPreferences(): UserPreferences {
    return this.prefsRepo.get(this.currentUserId);
  }

  updatePreferences(prefs: Partial<UserPreferences>): UserPreferences {
    const current = this.prefsRepo.get(this.currentUserId);
    const updated = { ...current, ...prefs };
    this.prefsRepo.save(updated, this.currentUserId);
    return updated;
  }

  toggleTheme(): UserPreferences {
    const current = this.prefsRepo.get(this.currentUserId);
    return this.updatePreferences({
      theme: current.theme === 'light' ? 'dark' : 'light',
    });
  }

  clearForUser(userId: string): void {
    this.prefsRepo.clear(userId);
  }
}

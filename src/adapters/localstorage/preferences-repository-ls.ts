import type { PreferencesRepository, UserPreferences } from '@domain/ports/preferences-repository';
import { DEFAULT_PREFERENCES } from '@domain/ports/preferences-repository';
import { config } from '@config/index';

const PREFIX = config.storage.localStoragePrefix;

function storageKey(userId?: string): string {
  return userId ? `${PREFIX}preferences_${userId}` : `${PREFIX}preferences`;
}

export class PreferencesRepositoryLS implements PreferencesRepository {
  get(userId?: string): UserPreferences {
    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (!raw) return { ...DEFAULT_PREFERENCES };
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        quietHours: {
          ...DEFAULT_PREFERENCES.quietHours,
          ...(parsed.quietHours ?? {}),
        },
        gradingConfig: {
          ...DEFAULT_PREFERENCES.gradingConfig,
          ...(parsed.gradingConfig ?? {}),
          typeWeights: {
            ...DEFAULT_PREFERENCES.gradingConfig.typeWeights,
            ...(parsed.gradingConfig?.typeWeights ?? {}),
          },
        },
      };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  save(prefs: UserPreferences, userId?: string): void {
    localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  }

  clear(userId?: string): void {
    localStorage.removeItem(storageKey(userId));
  }
}

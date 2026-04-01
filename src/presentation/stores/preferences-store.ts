import { writable } from 'svelte/store';
import type { UserPreferences } from '@domain/ports/preferences-repository';
import { DEFAULT_PREFERENCES } from '@domain/ports/preferences-repository';
import { preferencesService } from '@services/container';

export const preferences = writable<UserPreferences>(DEFAULT_PREFERENCES);

export function reloadPreferences() {
  preferences.set(preferencesService.getPreferences());
}

export function updatePreferences(prefs: Partial<UserPreferences>) {
  const updated = preferencesService.updatePreferences(prefs);
  preferences.set(updated);
}

export function toggleTheme() {
  const updated = preferencesService.toggleTheme();
  preferences.set(updated);
}

export function resetPreferences() {
  preferences.set(DEFAULT_PREFERENCES);
}

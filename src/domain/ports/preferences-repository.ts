export interface QuietHours {
  enabled: boolean;
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

export interface GradingConfig {
  roundingIncrement: number;
  typeWeights: Record<string, number>;
}

export const DEFAULT_GRADING_CONFIG: GradingConfig = {
  roundingIncrement: 0.5,
  typeWeights: {
    multiple_choice: 1.0,
    single_choice: 1.0,
    true_false: 0.5,
    fill_in_the_blank: 1.0,
    short_answer: 1.5,
    essay: 2.0,
  },
};

export interface UserPreferences {
  theme: 'light' | 'dark';
  showScores: boolean;
  scoringThreshold: number;
  lastFilter: string;
  quietHours: QuietHours;
  uiLanguage: string;
  gradingConfig: GradingConfig;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  showScores: true,
  scoringThreshold: 60,
  lastFilter: '',
  quietHours: {
    enabled: true,
    start: '21:00',
    end: '07:00',
  },
  uiLanguage: 'en',
  gradingConfig: { ...DEFAULT_GRADING_CONFIG },
};

export interface PreferencesRepository {
  get(userId?: string): UserPreferences;
  save(prefs: UserPreferences, userId?: string): void;
  clear(userId?: string): void;
}

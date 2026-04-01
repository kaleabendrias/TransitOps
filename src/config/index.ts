import configData from './app.config.json';

export interface AppConfig {
  appName: string;
  version: string;
  storage: {
    indexedDbName: string;
    indexedDbVersion: number;
    localStoragePrefix: string;
  };
  scoring: {
    maxScore: number;
    minScore: number;
    passingThreshold: number;
  };
  seats: {
    maxPerVenue: number;
    defaultRows: number;
    defaultSeatsPerRow: number;
  };
  holds: {
    durationMs: number;
    warningThresholdMs: number;
  };
  auth: {
    pbkdf2Iterations: number;
    hashAlgorithm: string;
    saltLength: number;
  };
  notifications: {
    rateLimitPerMinute: number;
    maxRetries: number;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
  };
}

export const config: AppConfig = configData;

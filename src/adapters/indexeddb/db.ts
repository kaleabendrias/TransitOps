import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import { config } from '@config/index';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface AppDBSchema extends DBSchema {
  seats: { key: string; value: any; indexes: { 'by-venue': string } };
  venues: { key: string; value: any };
  users: { key: string; value: any; indexes: { 'by-username': string } };
  trips: { key: string; value: any; indexes: { 'by-venue': string } };
  seatMap: { key: string; value: any; indexes: { 'by-trip': string } };
  holds: { key: string; value: any; indexes: { 'by-trip': string; 'by-seat': string; 'by-user': string; 'by-status': string } };
  questions: { key: string; value: any; indexes: { 'by-catalog': string; 'by-status': string } };
  attempts: { key: string; value: any; indexes: { 'by-user': string; 'by-question': string } };
  grades: { key: string; value: any; indexes: { 'by-attempt': string; 'by-reviewer': string; 'by-second-review': string } };
  catalogs: { key: string; value: any };
  devices: { key: string; value: any; indexes: { 'by-department': string } };
  departments: { key: string; value: any };
  projects: { key: string; value: any; indexes: { 'by-department': string } };
  notifications: { key: string; value: any; indexes: { 'by-user': string; 'by-status': string } };
  notificationTemplates: { key: string; value: any };
  notificationSubscriptions: { key: string; value: any; indexes: { 'by-user': string } };
  nutritionProfiles: { key: string; value: any; indexes: { 'by-user': string } };
  mealSuggestions: { key: string; value: any; indexes: { 'by-profile': string } };
  encryptedStore: { key: string; value: any };
}

let dbInstance: IDBPDatabase<AppDBSchema> | null = null;
let dbNameOverride: string | null = null;

/** @internal Testing only — overrides the database name for test isolation. */
export function setDbNameOverride(name: string): void {
  dbNameOverride = name;
}

export async function getDb(): Promise<IDBPDatabase<AppDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<AppDBSchema>(
    dbNameOverride ?? config.storage.indexedDbName,
    config.storage.indexedDbVersion,
    {
      upgrade(db, oldVersion) {
        // v1 stores
        if (!db.objectStoreNames.contains('venues')) db.createObjectStore('venues', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('seats')) {
          const s = db.createObjectStore('seats', { keyPath: 'id' });
          s.createIndex('by-venue', 'venueId');
        }

        // v2 stores
        if (!db.objectStoreNames.contains('users')) {
          const s = db.createObjectStore('users', { keyPath: 'id' });
          s.createIndex('by-username', 'username', { unique: true });
        }
        if (!db.objectStoreNames.contains('trips')) {
          const s = db.createObjectStore('trips', { keyPath: 'id' });
          s.createIndex('by-venue', 'venueId');
        }
        if (!db.objectStoreNames.contains('seatMap')) {
          const s = db.createObjectStore('seatMap', { keyPath: 'id' });
          s.createIndex('by-trip', 'tripId');
        }
        if (!db.objectStoreNames.contains('holds')) {
          const s = db.createObjectStore('holds', { keyPath: 'id' });
          s.createIndex('by-trip', 'tripId');
          s.createIndex('by-seat', 'seatMapEntryId');
          s.createIndex('by-user', 'userId');
          s.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('questions')) {
          const s = db.createObjectStore('questions', { keyPath: 'id' });
          s.createIndex('by-catalog', 'catalogId');
          if (oldVersion < 3) s.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('attempts')) {
          const s = db.createObjectStore('attempts', { keyPath: 'id' });
          s.createIndex('by-user', 'userId');
          s.createIndex('by-question', 'questionId');
        }
        if (!db.objectStoreNames.contains('grades')) {
          const s = db.createObjectStore('grades', { keyPath: 'id' });
          s.createIndex('by-attempt', 'attemptId');
          s.createIndex('by-reviewer', 'reviewerId');
          if (oldVersion < 3) s.createIndex('by-second-review', 'requiresSecondReview');
        }
        if (!db.objectStoreNames.contains('catalogs')) db.createObjectStore('catalogs', { keyPath: 'id' });

        // v3 stores
        if (!db.objectStoreNames.contains('devices')) {
          const s = db.createObjectStore('devices', { keyPath: 'id' });
          s.createIndex('by-department', 'departmentId');
        }
        if (!db.objectStoreNames.contains('departments')) db.createObjectStore('departments', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('projects')) {
          const s = db.createObjectStore('projects', { keyPath: 'id' });
          s.createIndex('by-department', 'departmentId');
        }
        if (!db.objectStoreNames.contains('notifications')) {
          const s = db.createObjectStore('notifications', { keyPath: 'id' });
          s.createIndex('by-user', 'userId');
          s.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('notificationTemplates')) db.createObjectStore('notificationTemplates', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('notificationSubscriptions')) {
          const s = db.createObjectStore('notificationSubscriptions', { keyPath: ['userId', 'templateId'] });
          s.createIndex('by-user', 'userId');
        }
        if (!db.objectStoreNames.contains('nutritionProfiles')) {
          const s = db.createObjectStore('nutritionProfiles', { keyPath: 'id' });
          s.createIndex('by-user', 'userId');
        }
        if (!db.objectStoreNames.contains('mealSuggestions')) {
          const s = db.createObjectStore('mealSuggestions', { keyPath: 'id' });
          s.createIndex('by-profile', 'profileId');
        }
        if (!db.objectStoreNames.contains('encryptedStore')) db.createObjectStore('encryptedStore', { keyPath: 'id' });
      },
    }
  );

  return dbInstance;
}

export function resetDbInstance(): void {
  dbInstance = null;
}

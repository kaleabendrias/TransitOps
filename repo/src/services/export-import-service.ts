import { getDb } from '@adapters/indexeddb/db';
import { auditLog } from './audit-log';

export interface ExportManifest {
  version: string;
  exportedAt: string;
  fingerprint: string;
  stores: string[];
  recordCounts: Record<string, number>;
}

export interface ExportBundle {
  manifest: ExportManifest;
  data: Record<string, unknown[]>;
}

const EXPORTABLE_STORES = [
  'venues', 'seats', 'trips', 'seatMap', 'holds', 'questions',
  'attempts', 'grades', 'catalogs', 'devices', 'departments',
  'projects', 'notifications', 'notificationTemplates',
  'nutritionProfiles', 'mealSuggestions', 'encryptedStore',
] as const;

/** Required fields and their expected types for each store. */
const STORE_SCHEMAS: Record<string, Record<string, string>> = {
  venues:      { id: 'string', name: 'string', rows: 'number', seatsPerRow: 'number' },
  seats:       { id: 'string', venueId: 'string', row: 'number', number: 'number', status: 'string' },
  trips:       { id: 'string', venueId: 'string', name: 'string', status: 'string' },
  seatMap:     { id: 'string', tripId: 'string', row: 'number', number: 'number', seatType: 'string' },
  holds:       { id: 'string', tripId: 'string', seatMapEntryId: 'string', userId: 'string', status: 'string' },
  questions:   { id: 'string', catalogId: 'string', text: 'string', type: 'string' },
  attempts:    { id: 'string', questionId: 'string', userId: 'string', status: 'string' },
  grades:      { id: 'string', attemptId: 'string', reviewerId: 'string', score: 'number', maxScore: 'number' },
  catalogs:    { id: 'string', name: 'string' },
  devices:     { id: 'string', name: 'string', departmentId: 'string', serialNumber: 'string' },
  departments: { id: 'string', name: 'string', code: 'string' },
  projects:    { id: 'string', name: 'string', departmentId: 'string', priceUsd: 'number' },
  notifications: { id: 'string', userId: 'string', subject: 'string', status: 'string' },
  notificationTemplates: { id: 'string', name: 'string', subjectTemplate: 'string' },
  nutritionProfiles: { id: 'string', userId: 'string', dailyCalories: 'number' },
  mealSuggestions: { id: 'string', profileId: 'string', name: 'string', calories: 'number' },
  encryptedStore: { id: 'string', iv: 'string', data: 'string', fingerprint: 'string' },
};

const VALID_SEAT_STATUSES = ['available', 'reserved', 'occupied', 'blocked'];
const VALID_TRIP_STATUSES = ['draft', 'published', 'boarding', 'departed', 'completed', 'cancelled'];
const VALID_HOLD_STATUSES = ['active', 'confirmed', 'expired', 'released'];
const VALID_QUESTION_STATUSES: string[] = ['active', 'inactive', 'deleted'];
const VALID_ATTEMPT_STATUSES = ['in_progress', 'submitted', 'graded'];
const VALID_NOTIF_STATUSES = ['pending', 'delivered', 'read', 'failed', 'dead_letter'];
const VALID_SEAT_TYPES = ['standard', 'ada', 'crew', 'premium'];
const VALID_QUESTION_TYPES = ['multiple_choice', 'single_choice', 'true_false', 'fill_in_the_blank', 'short_answer', 'essay'];

function validateRecord(storeName: string, record: unknown): string | null {
  if (!record || typeof record !== 'object') return 'not an object';
  const schema = STORE_SCHEMAS[storeName];
  if (!schema) return null;
  const obj = record as Record<string, unknown>;
  for (const [field, expectedType] of Object.entries(schema)) {
    if (!(field in obj)) return `missing required field "${field}"`;
    if (typeof obj[field] !== expectedType) return `field "${field}" must be ${expectedType}, got ${typeof obj[field]}`;
  }
  // Semantic validation — reject invalid business states
  return validateSemantics(storeName, obj);
}

function validateSemantics(store: string, obj: Record<string, unknown>): string | null {
  switch (store) {
    case 'seats':
      if (!VALID_SEAT_STATUSES.includes(obj.status as string)) return `invalid seat status "${obj.status}"`;
      break;
    case 'trips':
      if (!VALID_TRIP_STATUSES.includes(obj.status as string)) return `invalid trip status "${obj.status}"`;
      break;
    case 'seatMap':
      if (!VALID_SEAT_TYPES.includes(obj.seatType as string)) return `invalid seat type "${obj.seatType}"`;
      if (typeof obj.row === 'number' && obj.row < 1) return 'row must be >= 1';
      break;
    case 'holds':
      if (!VALID_HOLD_STATUSES.includes(obj.status as string)) return `invalid hold status "${obj.status}"`;
      break;
    case 'questions':
      if (!VALID_QUESTION_TYPES.includes(obj.type as string)) return `invalid question type "${obj.type}"`;
      if ('status' in obj && !VALID_QUESTION_STATUSES.includes(obj.status as string)) return `invalid question status "${obj.status}"`;
      break;
    case 'attempts':
      if (!VALID_ATTEMPT_STATUSES.includes(obj.status as string)) return `invalid attempt status "${obj.status}"`;
      break;
    case 'grades':
      if (typeof obj.score === 'number' && obj.score < 0) return 'score cannot be negative';
      if (typeof obj.maxScore === 'number' && obj.maxScore <= 0) return 'maxScore must be positive';
      if (typeof obj.score === 'number' && typeof obj.maxScore === 'number' && obj.score > obj.maxScore) return 'score exceeds maxScore';
      break;
    case 'notifications':
      if (!VALID_NOTIF_STATUSES.includes(obj.status as string)) return `invalid notification status "${obj.status}"`;
      break;
    case 'projects':
      if (typeof obj.priceUsd === 'number' && obj.priceUsd < 0) return 'priceUsd cannot be negative';
      break;
    case 'venues':
      if (typeof obj.rows === 'number' && obj.rows < 1) return 'rows must be >= 1';
      if (typeof obj.seatsPerRow === 'number' && obj.seatsPerRow < 1) return 'seatsPerRow must be >= 1';
      break;
    case 'nutritionProfiles':
      if (typeof obj.dailyCalories === 'number' && obj.dailyCalories < 0) return 'dailyCalories cannot be negative';
      break;
    case 'mealSuggestions':
      if (typeof obj.calories === 'number' && obj.calories < 0) return 'calories cannot be negative';
      break;
  }
  return null;
}

export class ExportImportService {
  async exportToJson(): Promise<Blob> {
    const db = await getDb();
    const data: Record<string, unknown[]> = {};
    const recordCounts: Record<string, number> = {};

    for (const storeName of EXPORTABLE_STORES) {
      try {
        const records = await db.getAll(storeName);
        data[storeName] = records;
        recordCounts[storeName] = records.length;
      } catch {
        data[storeName] = [];
        recordCounts[storeName] = 0;
      }
    }

    const dataJson = JSON.stringify(data);
    const fingerprint = await this.sha256(dataJson);

    const bundle: ExportBundle = {
      manifest: {
        version: '3.0.0',
        exportedAt: new Date().toISOString(),
        fingerprint,
        stores: [...EXPORTABLE_STORES],
        recordCounts,
      },
      data,
    };

    return new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  }

  async importFromJson(file: File): Promise<{ imported: number; errors: string[] }> {
    const text = await file.text();
    const bundle = JSON.parse(text) as ExportBundle;
    const errors: string[] = [];

    if (!bundle.manifest || !bundle.data) {
      throw new Error('Invalid export file: missing manifest or data');
    }
    if (!bundle.manifest.version || !bundle.manifest.fingerprint) {
      throw new Error('Invalid export file: incomplete manifest');
    }

    const dataJson = JSON.stringify(bundle.data);
    const computedFingerprint = await this.sha256(dataJson);
    if (computedFingerprint !== bundle.manifest.fingerprint) {
      auditLog('error', 'import', 'tamper_detected', { expected: bundle.manifest.fingerprint, computed: computedFingerprint });
      throw new Error('Tamper detected: SHA-256 fingerprint mismatch. File may have been modified.');
    }

    const validStores = new Set<string>(EXPORTABLE_STORES);
    for (const store of Object.keys(bundle.data)) {
      if (!validStores.has(store)) {
        errors.push(`Unknown store "${store}" — skipped`);
      }
    }

    const db = await getDb();
    let imported = 0;

    for (const storeName of EXPORTABLE_STORES) {
      const records = bundle.data[storeName];
      if (!records || !Array.isArray(records)) continue;

      try {
        const tx = db.transaction(storeName, 'readwrite');
        for (const record of records) {
          const validationError = validateRecord(storeName, record);
          if (validationError) {
            errors.push(`${storeName}: ${validationError}`);
            continue;
          }
          await tx.store.put(record);
          imported++;
        }
        await tx.done;
      } catch (e) {
        errors.push(`Failed to import "${storeName}": ${e instanceof Error ? e.message : 'unknown error'}`);
      }
    }

    return { imported, errors };
  }

  triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private async sha256(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

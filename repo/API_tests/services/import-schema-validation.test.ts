import { describe, it, expect, beforeEach } from 'vitest';
import { ExportImportService } from '@services/export-import-service';
import type { ExportBundle } from '@services/export-import-service';

describe('Import JSON schema validation', () => {
  let svc: ExportImportService;

  beforeEach(() => { svc = new ExportImportService(); });

  async function makeBundle(data: Record<string, unknown[]>): Promise<File> {
    const dataJson = JSON.stringify(data);
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(dataJson));
    const fingerprint = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    const bundle: ExportBundle = {
      manifest: { version: '3.0.0', exportedAt: new Date().toISOString(), fingerprint, stores: Object.keys(data), recordCounts: {} },
      data,
    };
    return new File([JSON.stringify(bundle)], 'test.json', { type: 'application/json' });
  }

  it('rejects venue record missing required name field', async () => {
    const file = await makeBundle({ venues: [{ id: 'v1', rows: 5, seatsPerRow: 10 }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('venues') && e.includes('name'))).toBe(true);
  });

  it('rejects venue record with wrong type for rows', async () => {
    const file = await makeBundle({ venues: [{ id: 'v1', name: 'Hall', rows: 'five', seatsPerRow: 10 }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('rows') && e.includes('number'))).toBe(true);
  });

  it('accepts valid venue record', async () => {
    const file = await makeBundle({ venues: [{ id: 'v1', name: 'Hall', rows: 5, seatsPerRow: 10, createdAt: 1, updatedAt: 1 }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(1);
    expect(result.errors.length).toBe(0);
  });

  it('rejects grade record missing score field', async () => {
    const file = await makeBundle({ grades: [{ id: 'g1', attemptId: 'a1', reviewerId: 'r1', maxScore: 10 }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('grades') && e.includes('score'))).toBe(true);
  });

  it('rejects notification record missing userId', async () => {
    const file = await makeBundle({ notifications: [{ id: 'n1', subject: 'Hi', status: 'pending' }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('userId'))).toBe(true);
  });

  it('rejects encryptedStore record missing iv', async () => {
    const file = await makeBundle({ encryptedStore: [{ id: 'e1', data: 'abc', fingerprint: 'def' }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('iv'))).toBe(true);
  });

  it('rejects null records', async () => {
    const file = await makeBundle({ venues: [null as unknown as Record<string, unknown>] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('not an object'))).toBe(true);
  });

  it('mixed valid and invalid records: valid ones imported, invalid ones logged', async () => {
    const file = await makeBundle({
      departments: [
        { id: 'd1', name: 'Lab', code: 'LAB', createdAt: 1, updatedAt: 1, isActive: true, devices: [], sampleTypes: [], executionQueues: [], tags: [] },
        { id: 'd2', code: 'BAD' }, // missing name
      ],
    });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('name');
  });
});

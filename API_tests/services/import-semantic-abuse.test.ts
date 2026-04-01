import { describe, it, expect, beforeEach } from 'vitest';
import { ExportImportService } from '@services/export-import-service';
import type { ExportBundle } from '@services/export-import-service';

describe('Import semantic abuse rejection', () => {
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

  it('rejects seat with invalid status', async () => {
    const file = await makeBundle({ seats: [{ id: 's1', venueId: 'v1', row: 1, number: 1, status: 'hacked' }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('invalid seat status'))).toBe(true);
  });

  it('rejects trip with invalid status', async () => {
    const file = await makeBundle({ trips: [{ id: 't1', venueId: 'v1', name: 'T', status: 'nonexistent' }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('invalid trip status'))).toBe(true);
  });

  it('rejects hold with invalid status', async () => {
    const file = await makeBundle({ holds: [{ id: 'h1', tripId: 't1', seatMapEntryId: 's1', userId: 'u1', status: 'stolen' }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('invalid hold status'))).toBe(true);
  });

  it('rejects grade with negative score', async () => {
    const file = await makeBundle({ grades: [{ id: 'g1', attemptId: 'a1', reviewerId: 'r1', score: -5, maxScore: 10 }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('score cannot be negative'))).toBe(true);
  });

  it('rejects grade with score exceeding maxScore', async () => {
    const file = await makeBundle({ grades: [{ id: 'g1', attemptId: 'a1', reviewerId: 'r1', score: 15, maxScore: 10 }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('score exceeds maxScore'))).toBe(true);
  });

  it('rejects grade with non-positive maxScore', async () => {
    const file = await makeBundle({ grades: [{ id: 'g1', attemptId: 'a1', reviewerId: 'r1', score: 0, maxScore: 0 }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('maxScore must be positive'))).toBe(true);
  });

  it('rejects project with negative price', async () => {
    const file = await makeBundle({ projects: [{ id: 'p1', name: 'P', departmentId: 'd1', priceUsd: -100 }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('priceUsd cannot be negative'))).toBe(true);
  });

  it('rejects venue with zero rows', async () => {
    const file = await makeBundle({ venues: [{ id: 'v1', name: 'V', rows: 0, seatsPerRow: 5 }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('rows must be >= 1'))).toBe(true);
  });

  it('rejects seatMap with invalid seatType', async () => {
    const file = await makeBundle({ seatMap: [{ id: 's1', tripId: 't1', row: 1, number: 1, seatType: 'vip' }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('invalid seat type'))).toBe(true);
  });

  it('rejects notification with invalid status', async () => {
    const file = await makeBundle({ notifications: [{ id: 'n1', userId: 'u1', subject: 'S', status: 'sent' }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('invalid notification status'))).toBe(true);
  });

  it('rejects question with invalid type', async () => {
    const file = await makeBundle({ questions: [{ id: 'q1', catalogId: 'c1', text: 'Q', type: 'oral_exam' }] });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(0);
    expect(result.errors.some(e => e.includes('invalid question type'))).toBe(true);
  });

  it('accepts valid records with correct statuses', async () => {
    const file = await makeBundle({
      seats: [{ id: 's1', venueId: 'v1', row: 1, number: 1, status: 'available', score: 50, createdAt: 1, updatedAt: 1, label: 'R1S1' }],
      trips: [{ id: 't1', venueId: 'v1', name: 'T', status: 'draft', createdAt: 1, updatedAt: 1, departureTime: 1, createdBy: 'u1', description: '' }],
    });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBe(2);
    expect(result.errors.length).toBe(0);
  });
});

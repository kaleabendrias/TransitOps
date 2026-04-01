import { describe, it, expect, beforeEach } from 'vitest';
import { ExportImportService } from '@services/export-import-service';
import { VenueRepositoryIDB } from '@adapters/indexeddb/venue-repository-idb';
import { createVenue } from '@domain/models/venue';
import type { ExportBundle } from '@services/export-import-service';

describe('ExportImportService', () => {
  let svc: ExportImportService;
  let venueRepo: VenueRepositoryIDB;

  beforeEach(() => {
    svc = new ExportImportService();
    venueRepo = new VenueRepositoryIDB();
  });

  it('exports data with manifest and fingerprint', async () => {
    await venueRepo.save(createVenue({ name: 'Hall A', rows: 5, seatsPerRow: 10 }));

    const blob = await svc.exportToJson();
    const text = await blob.text();
    const bundle: ExportBundle = JSON.parse(text);

    expect(bundle.manifest.version).toBe('3.0.0');
    expect(bundle.manifest.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(bundle.manifest.stores).toContain('venues');
    expect(bundle.manifest.recordCounts.venues).toBe(1);
    expect(bundle.data.venues).toHaveLength(1);
  });

  it('import round-trip preserves data', async () => {
    const v = createVenue({ name: 'Round Trip Hall', rows: 3, seatsPerRow: 5 });
    await venueRepo.save(v);

    const blob = await svc.exportToJson();
    // Clear DB
    await venueRepo.delete(v.id);
    expect(await venueRepo.getAll()).toHaveLength(0);

    // Import
    const file = new File([blob], 'test.json', { type: 'application/json' });
    const result = await svc.importFromJson(file);
    expect(result.imported).toBeGreaterThan(0);

    const restored = await venueRepo.getAll();
    expect(restored).toHaveLength(1);
    expect(restored[0].name).toBe('Round Trip Hall');
  });

  it('detects tampered fingerprint', async () => {
    await venueRepo.save(createVenue({ name: 'Test', rows: 1, seatsPerRow: 1 }));
    const blob = await svc.exportToJson();
    const text = await blob.text();
    const bundle: ExportBundle = JSON.parse(text);

    // Tamper with the data
    bundle.data.venues = [{ id: 'tampered', name: 'FAKE' }];
    // Keep original fingerprint (mismatch)

    const tampered = new File([JSON.stringify(bundle)], 'tampered.json', { type: 'application/json' });
    await expect(svc.importFromJson(tampered)).rejects.toThrow('Tamper detected');
  });

  it('rejects missing manifest', async () => {
    const bad = new File([JSON.stringify({ data: {} })], 'bad.json', { type: 'application/json' });
    await expect(svc.importFromJson(bad)).rejects.toThrow('missing manifest');
  });

  it('rejects incomplete manifest', async () => {
    const bad = new File([JSON.stringify({ manifest: {}, data: {} })], 'bad.json', { type: 'application/json' });
    await expect(svc.importFromJson(bad)).rejects.toThrow('incomplete manifest');
  });

  it('warns on unknown stores', async () => {
    const bundle: ExportBundle = {
      manifest: {
        version: '3.0.0',
        exportedAt: new Date().toISOString(),
        fingerprint: '',
        stores: ['venues', 'unknownStore'],
        recordCounts: { venues: 0, unknownStore: 0 },
      },
      data: { venues: [], unknownStore: [{ id: '1' }] },
    };
    // Fix fingerprint
    const dataJson = JSON.stringify(bundle.data);
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(dataJson));
    bundle.manifest.fingerprint = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

    const file = new File([JSON.stringify(bundle)], 'test.json', { type: 'application/json' });
    const result = await svc.importFromJson(file);
    expect(result.errors.some(e => e.includes('unknownStore'))).toBe(true);
  });

  it('handles invalid records gracefully', async () => {
    const bundle: ExportBundle = {
      manifest: { version: '3.0.0', exportedAt: '', fingerprint: '', stores: ['venues'], recordCounts: { venues: 1 } },
      data: { venues: [null as any] },
    };
    const dataJson = JSON.stringify(bundle.data);
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(dataJson));
    bundle.manifest.fingerprint = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

    const file = new File([JSON.stringify(bundle)], 'test.json', { type: 'application/json' });
    const result = await svc.importFromJson(file);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

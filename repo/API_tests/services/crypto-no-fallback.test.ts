import { describe, it, expect, beforeEach } from 'vitest';
import { CryptoStorageService } from '@services/crypto-storage-service';

describe('Crypto requires explicit key material (no fallback)', () => {
  let crypto: CryptoStorageService;

  beforeEach(() => {
    crypto = new CryptoStorageService();
  });

  it('encrypt throws without key material', async () => {
    await expect(crypto.encrypt('id', 'data')).rejects.toThrow('No encryption key material');
  });

  it('decrypt throws without key material', async () => {
    crypto.setKeyMaterial('temp');
    await crypto.encrypt('id', 'data');
    crypto.clearKeyMaterial();
    await expect(crypto.decrypt('id')).rejects.toThrow('No encryption key material');
  });

  it('sha256 works without key material (non-sensitive)', async () => {
    const hash = await crypto.sha256('test');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifyFingerprint returns false without key material', async () => {
    crypto.setKeyMaterial('k');
    await crypto.encrypt('fp', 'data');
    crypto.clearKeyMaterial();
    const valid = await crypto.verifyFingerprint('fp');
    expect(valid).toBe(false);
  });

  it('operations succeed after setKeyMaterial', async () => {
    crypto.setKeyMaterial('valid-key');
    await crypto.encrypt('ok', 'works');
    expect(await crypto.decrypt('ok')).toBe('works');
  });
});

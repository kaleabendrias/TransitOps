import { describe, it, expect, beforeEach } from 'vitest';
import { CryptoStorageService } from '@services/crypto-storage-service';

describe('CryptoStorageService', () => {
  let svc: CryptoStorageService;

  beforeEach(() => { svc = new CryptoStorageService(); svc.setKeyMaterial('test-key-material'); });

  it('encrypt and decrypt round-trip', async () => {
    await svc.encrypt('key1', 'Hello Secret World');
    const result = await svc.decrypt('key1');
    expect(result).toBe('Hello Secret World');
  });

  it('decrypt returns null for unknown key', async () => {
    const result = await svc.decrypt('nonexistent');
    expect(result).toBeNull();
  });

  it('different IDs store different data', async () => {
    await svc.encrypt('a', 'Alpha');
    await svc.encrypt('b', 'Beta');
    expect(await svc.decrypt('a')).toBe('Alpha');
    expect(await svc.decrypt('b')).toBe('Beta');
  });

  it('overwriting same key', async () => {
    await svc.encrypt('key', 'first');
    await svc.encrypt('key', 'second');
    expect(await svc.decrypt('key')).toBe('second');
  });

  it('delete removes encrypted data', async () => {
    await svc.encrypt('del', 'to be deleted');
    await svc.delete('del');
    expect(await svc.decrypt('del')).toBeNull();
  });

  it('sha256 returns consistent hex digest', async () => {
    const h1 = await svc.sha256('hello');
    const h2 = await svc.sha256('hello');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('sha256 differs for different input', async () => {
    const h1 = await svc.sha256('hello');
    const h2 = await svc.sha256('world');
    expect(h1).not.toBe(h2);
  });

  it('verifyFingerprint returns true for valid', async () => {
    await svc.encrypt('fp1', 'data');
    expect(await svc.verifyFingerprint('fp1')).toBe(true);
  });

  it('verifyFingerprint returns false for unknown', async () => {
    expect(await svc.verifyFingerprint('unknown')).toBe(false);
  });

  it('handles unicode and special characters', async () => {
    const text = 'Hello 世界! 🌍 <script>alert("xss")</script>';
    await svc.encrypt('unicode', text);
    expect(await svc.decrypt('unicode')).toBe(text);
  });

  it('handles empty string', async () => {
    await svc.encrypt('empty', '');
    expect(await svc.decrypt('empty')).toBe('');
  });

  it('handles large data', async () => {
    const large = 'x'.repeat(10000);
    await svc.encrypt('large', large);
    expect(await svc.decrypt('large')).toBe(large);
  });
});

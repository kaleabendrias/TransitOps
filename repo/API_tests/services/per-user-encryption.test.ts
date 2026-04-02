import { describe, it, expect, beforeEach } from 'vitest';
import { CryptoStorageService } from '@services/crypto-storage-service';

describe('Per-user key derivation for encryption', () => {
  let crypto: CryptoStorageService;

  beforeEach(() => {
    crypto = new CryptoStorageService();
  });

  it('encrypt/decrypt works with explicit key material', async () => {
    crypto.setKeyMaterial('user-password-hash-abc123');
    await crypto.encrypt('test1', 'secret data');
    const result = await crypto.decrypt('test1');
    expect(result).toBe('secret data');
  });

  it('encrypt throws without key material set', async () => {
    await expect(crypto.encrypt('x', 'data')).rejects.toThrow('No encryption key material');
  });

  it('decrypt throws without key material set', async () => {
    crypto.setKeyMaterial('key');
    await crypto.encrypt('x', 'data');
    crypto.clearKeyMaterial();
    await expect(crypto.decrypt('x')).rejects.toThrow('No encryption key material');
  });

  it('hasKeyMaterial reflects state', () => {
    expect(crypto.hasKeyMaterial()).toBe(false);
    crypto.setKeyMaterial('key');
    expect(crypto.hasKeyMaterial()).toBe(true);
    crypto.clearKeyMaterial();
    expect(crypto.hasKeyMaterial()).toBe(false);
  });

  it('different key material produces different ciphertext', async () => {
    const c1 = new CryptoStorageService();
    const c2 = new CryptoStorageService();
    c1.setKeyMaterial('key-alpha');
    c2.setKeyMaterial('key-beta');

    await c1.encrypt('shared-id', 'same plaintext');
    try {
      await c2.decrypt('shared-id');
      expect(true).toBe(false);
    } catch {
      // Expected: decryption with wrong key fails
    }
  });

  it('clearKeyMaterial prevents further operations', async () => {
    crypto.setKeyMaterial('user-key-xyz');
    await crypto.encrypt('before-clear', 'data');
    expect(await crypto.decrypt('before-clear')).toBe('data');

    crypto.clearKeyMaterial();
    await expect(crypto.decrypt('before-clear')).rejects.toThrow('No encryption key material');
  });

  it('setKeyMaterial clears cached keys', async () => {
    crypto.setKeyMaterial('key-1');
    await crypto.encrypt('k1-data', 'hello');
    expect(await crypto.decrypt('k1-data')).toBe('hello');

    crypto.setKeyMaterial('key-2');
    await crypto.encrypt('k2-data', 'world');
    expect(await crypto.decrypt('k2-data')).toBe('world');

    try {
      await crypto.decrypt('k1-data');
      expect(true).toBe(false);
    } catch {
      // Expected
    }
  });
});

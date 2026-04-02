import { EncryptedStoreIDB, type EncryptedRecord } from '@adapters/indexeddb/encrypted-store-idb';

function arrayBufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToArrayBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export class CryptoStorageService {
  private store = new EncryptedStoreIDB();
  private keyCache: Map<string, CryptoKey> = new Map();
  private keyMaterial: string | null = null;

  setKeyMaterial(material: string): void {
    this.keyMaterial = material;
    this.keyCache.clear();
  }

  clearKeyMaterial(): void {
    this.keyMaterial = null;
    this.keyCache.clear();
  }

  hasKeyMaterial(): boolean {
    return this.keyMaterial !== null;
  }

  private async getKey(): Promise<CryptoKey> {
    if (!this.keyMaterial) {
      throw new Error('No encryption key material set. Login required before sensitive data operations.');
    }
    const km = this.keyMaterial;
    const cached = this.keyCache.get(km);
    if (cached) return cached;

    const encoder = new TextEncoder();
    const raw = await crypto.subtle.importKey(
      'raw', encoder.encode(km), 'PBKDF2', false, ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: encoder.encode(km.slice(0, 16)), iterations: 100000, hash: 'SHA-256' },
      raw,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    this.keyCache.set(km, key);
    return key;
  }

  async encrypt(id: string, plaintext: string): Promise<void> {
    const key = await this.getKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    const fingerprint = await this.sha256(plaintext);

    const record: EncryptedRecord = {
      id,
      iv: arrayBufToBase64(iv.buffer),
      data: arrayBufToBase64(ciphertext),
      fingerprint,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.store.save(record);
  }

  async decrypt(id: string): Promise<string | null> {
    const record = await this.store.get(id);
    if (!record) return null;

    const key = await this.getKey();
    const iv = new Uint8Array(base64ToArrayBuf(record.iv));
    const ciphertext = base64ToArrayBuf(record.data);

    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    const plaintext = new TextDecoder().decode(plainBuf);

    const fingerprint = await this.sha256(plaintext);
    if (fingerprint !== record.fingerprint) {
      throw new Error('Data integrity check failed: fingerprint mismatch');
    }

    return plaintext;
  }

  async delete(id: string): Promise<void> {
    await this.store.delete(id);
  }

  async sha256(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async verifyFingerprint(id: string): Promise<boolean> {
    const record = await this.store.get(id);
    if (!record) return false;
    try {
      await this.decrypt(id);
      return true;
    } catch {
      return false;
    }
  }
}

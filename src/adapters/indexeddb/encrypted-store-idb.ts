import { getDb } from './db';

export interface EncryptedRecord {
  id: string;
  iv: string;       // base64 IV
  data: string;      // base64 ciphertext
  fingerprint: string; // SHA-256 hash of plaintext
  createdAt: number;
  updatedAt: number;
}

export class EncryptedStoreIDB {
  async get(id: string): Promise<EncryptedRecord | null> {
    const db = await getDb();
    return ((await db.get('encryptedStore', id)) as EncryptedRecord) ?? null;
  }

  async save(record: EncryptedRecord): Promise<void> {
    const db = await getDb();
    await db.put('encryptedStore', { ...record });
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('encryptedStore', id);
  }

  async getAll(): Promise<EncryptedRecord[]> {
    const db = await getDb();
    return db.getAll('encryptedStore') as Promise<EncryptedRecord[]>;
  }
}

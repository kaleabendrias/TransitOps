import type { User } from '@domain/models/user';
import type { UserRepository } from '@domain/ports/user-repository';
import { getDb } from './db';

export class UserRepositoryIDB implements UserRepository {
  async getAll(): Promise<User[]> {
    const db = await getDb();
    return (await db.getAll('users')) as User[];
  }

  async getById(id: string): Promise<User | null> {
    const db = await getDb();
    return ((await db.get('users', id)) as User) ?? null;
  }

  async getByUsername(username: string): Promise<User | null> {
    const db = await getDb();
    return ((await db.getFromIndex('users', 'by-username', username.toLowerCase().trim())) as User) ?? null;
  }

  async save(user: User): Promise<void> {
    const db = await getDb();
    await db.put('users', { ...user });
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('users', id);
  }
}

import type { Department } from '@domain/models/association';
import type { DepartmentRepository } from '@domain/ports/association-repository';
import { getDb } from './db';

export class DepartmentRepositoryIDB implements DepartmentRepository {
  async getAll(): Promise<Department[]> { const db = await getDb(); return db.getAll('departments') as Promise<Department[]>; }
  async getById(id: string): Promise<Department | null> { const db = await getDb(); return ((await db.get('departments', id)) as Department) ?? null; }
  async save(department: Department): Promise<void> { const db = await getDb(); await db.put('departments', { ...department }); }
  async delete(id: string): Promise<void> { const db = await getDb(); await db.delete('departments', id); }
}

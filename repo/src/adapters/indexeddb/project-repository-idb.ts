import type { Project } from '@domain/models/association';
import type { ProjectRepository } from '@domain/ports/association-repository';
import { getDb } from './db';

export class ProjectRepositoryIDB implements ProjectRepository {
  async getAll(): Promise<Project[]> { const db = await getDb(); return db.getAll('projects') as Promise<Project[]>; }
  async getById(id: string): Promise<Project | null> { const db = await getDb(); return ((await db.get('projects', id)) as Project) ?? null; }
  async getByDepartment(departmentId: string): Promise<Project[]> { const db = await getDb(); return db.getAllFromIndex('projects', 'by-department', departmentId) as Promise<Project[]>; }
  async save(project: Project): Promise<void> { const db = await getDb(); await db.put('projects', { ...project }); }
  async delete(id: string): Promise<void> { const db = await getDb(); await db.delete('projects', id); }
}

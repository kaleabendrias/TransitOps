import type { AssociationCatalog } from '@domain/models/catalog';
import type { CatalogRepository } from '@domain/ports/catalog-repository';
import { getDb } from './db';

export class CatalogRepositoryIDB implements CatalogRepository {
  async getAll(): Promise<AssociationCatalog[]> {
    const db = await getDb();
    return (await db.getAll('catalogs')) as AssociationCatalog[];
  }

  async getById(id: string): Promise<AssociationCatalog | null> {
    const db = await getDb();
    return ((await db.get('catalogs', id)) as AssociationCatalog) ?? null;
  }

  async save(catalog: AssociationCatalog): Promise<void> {
    const db = await getDb();
    await db.put('catalogs', { ...catalog });
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('catalogs', id);
  }
}

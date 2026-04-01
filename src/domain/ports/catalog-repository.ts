import type { AssociationCatalog } from '../models/catalog';

export interface CatalogRepository {
  getAll(): Promise<AssociationCatalog[]>;
  getById(id: string): Promise<AssociationCatalog | null>;
  save(catalog: AssociationCatalog): Promise<void>;
  delete(id: string): Promise<void>;
}

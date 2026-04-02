export interface AssociationCatalog {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly createdBy: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export function createCatalog(params: {
  name: string;
  description?: string;
  category?: string;
  createdBy: string;
}): AssociationCatalog {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: params.name,
    description: params.description ?? '',
    category: params.category ?? 'general',
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

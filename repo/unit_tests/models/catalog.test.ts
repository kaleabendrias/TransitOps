import { describe, it, expect } from 'vitest';
import { createCatalog } from '@domain/models/catalog';

describe('Catalog Model', () => {
  it('creates with defaults', () => {
    const c = createCatalog({ name: 'General', createdBy: 'u1' });
    expect(c.name).toBe('General');
    expect(c.description).toBe('');
    expect(c.category).toBe('general');
    expect(c.createdBy).toBe('u1');
    expect(c.id).toBeTruthy();
  });

  it('creates with custom fields', () => {
    const c = createCatalog({ name: 'Science', description: 'Sci Q', category: 'science', createdBy: 'u2' });
    expect(c.description).toBe('Sci Q');
    expect(c.category).toBe('science');
  });
});

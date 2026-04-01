import { describe, it, expect, beforeEach } from 'vitest';
import { AssociationService } from '@services/association-service';
import { DeviceRepositoryIDB } from '@adapters/indexeddb/device-repository-idb';
import { DepartmentRepositoryIDB } from '@adapters/indexeddb/department-repository-idb';
import { ProjectRepositoryIDB } from '@adapters/indexeddb/project-repository-idb';
import type { ServiceActor } from '@services/service-actor';

describe('AssociationService date validation', () => {
  let svc: AssociationService;
  const actor: ServiceActor = { userId: 'a1', role: 'administrator' };

  beforeEach(() => { svc = new AssociationService(new DeviceRepositoryIDB(), new DepartmentRepositoryIDB(), new ProjectRepositoryIDB()); });

  it('rejects invalid start date', async () => {
    await expect(svc.createProject({ name: 'P', departmentId: 'd', effectiveDateStart: 'bad', effectiveDateEnd: '12/31/2026', priceUsd: 0 }, actor)).rejects.toThrow('Invalid start date');
  });
  it('rejects invalid end date', async () => {
    await expect(svc.createProject({ name: 'P', departmentId: 'd', effectiveDateStart: '01/01/2026', effectiveDateEnd: '13/01/2026', priceUsd: 0 }, actor)).rejects.toThrow('Invalid end date');
  });
  it('rejects end before start', async () => {
    await expect(svc.createProject({ name: 'P', departmentId: 'd', effectiveDateStart: '12/31/2026', effectiveDateEnd: '01/01/2026', priceUsd: 0 }, actor)).rejects.toThrow('after start');
  });
  it('accepts valid range', async () => {
    expect((await svc.createProject({ name: 'Good', departmentId: 'd', effectiveDateStart: '01/01/2026', effectiveDateEnd: '12/31/2026', priceUsd: 50 }, actor)).name).toBe('Good');
  });
  it('saveProject rejects invalid dates', async () => {
    const proj = await svc.createProject({ name: 'Orig', departmentId: 'd', effectiveDateStart: '01/01/2026', effectiveDateEnd: '12/31/2026', priceUsd: 10 }, actor);
    await expect(svc.saveProject({ ...proj, effectiveDateStart: 'bad-date', updatedAt: Date.now() }, actor)).rejects.toThrow('Invalid start date');
  });
  it('saveProject rejects reversed range', async () => {
    const proj = await svc.createProject({ name: 'Orig', departmentId: 'd', effectiveDateStart: '01/01/2026', effectiveDateEnd: '12/31/2026', priceUsd: 10 }, actor);
    await expect(svc.saveProject({ ...proj, effectiveDateStart: '12/01/2026', effectiveDateEnd: '01/01/2026', updatedAt: Date.now() }, actor)).rejects.toThrow('after start');
  });
  it('rejects Feb 30', async () => {
    await expect(svc.createProject({ name: 'P', departmentId: 'd', effectiveDateStart: '02/30/2026', effectiveDateEnd: '12/31/2026', priceUsd: 0 }, actor)).rejects.toThrow('Invalid start date');
  });
});

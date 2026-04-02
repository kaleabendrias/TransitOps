import { describe, it, expect, beforeEach } from 'vitest';
import { AssociationService } from '@services/association-service';
import { DeviceRepositoryIDB } from '@adapters/indexeddb/device-repository-idb';
import { DepartmentRepositoryIDB } from '@adapters/indexeddb/department-repository-idb';
import { ProjectRepositoryIDB } from '@adapters/indexeddb/project-repository-idb';
import type { ServiceActor } from '@services/service-actor';

describe('AssociationService', () => {
  let svc: AssociationService;
  const actor: ServiceActor = { userId: 'a1', role: 'administrator' };

  beforeEach(() => { svc = new AssociationService(new DeviceRepositoryIDB(), new DepartmentRepositoryIDB(), new ProjectRepositoryIDB()); });

  it('creates and lists departments', async () => {
    await svc.createDepartment('Lab', 'LAB', [], [], actor);
    expect((await svc.listDepartments()).length).toBe(1);
  });
  it('validates department creation', async () => {
    await expect(svc.createDepartment('', 'X', [], [], actor)).rejects.toThrow('name is required');
    await expect(svc.createDepartment('X', '', [], [], actor)).rejects.toThrow('code is required');
  });
  it('creates and lists devices', async () => {
    const dept = await svc.createDepartment('Lab', 'LAB', [], [], actor);
    await svc.createDevice('Scanner', dept.id, 'SN001', actor);
    expect((await svc.listDevices()).length).toBe(1);
  });
  it('validates device creation', async () => {
    await expect(svc.createDevice('', 'd1', 'SN', actor)).rejects.toThrow('name is required');
    await expect(svc.createDevice('X', '', 'SN', actor)).rejects.toThrow('Department is required');
    await expect(svc.createDevice('X', 'd1', '', actor)).rejects.toThrow('Serial number is required');
  });
  it('creates and lists projects', async () => {
    const dept = await svc.createDepartment('Lab', 'LAB', [], [], actor);
    await svc.createProject({ name: 'Study A', departmentId: dept.id, effectiveDateStart: '01/01/2026', effectiveDateEnd: '12/31/2026', priceUsd: 100 }, actor);
    expect((await svc.listProjects()).length).toBe(1);
  });
  it('validates project creation', async () => {
    await expect(svc.createProject({ name: '', departmentId: 'd', effectiveDateStart: '01/01/2026', effectiveDateEnd: '12/31/2026', priceUsd: 0 }, actor)).rejects.toThrow('name is required');
    await expect(svc.createProject({ name: 'X', departmentId: '', effectiveDateStart: '01/01/2026', effectiveDateEnd: '12/31/2026', priceUsd: 0 }, actor)).rejects.toThrow('Department is required');
    await expect(svc.createProject({ name: 'X', departmentId: 'd', effectiveDateStart: '01/01/2026', effectiveDateEnd: '12/31/2026', priceUsd: -5 }, actor)).rejects.toThrow('negative');
  });
  it('saves and updates department', async () => {
    const dept = await svc.createDepartment('Old', 'OLD', [], [], actor);
    await svc.saveDepartment({ ...dept, name: 'New', updatedAt: Date.now() }, actor);
    expect((await svc.listDepartments())[0].name).toBe('New');
  });
  it('deletes entities', async () => {
    const dept = await svc.createDepartment('Lab', 'LAB', [], [], actor);
    await svc.deleteDepartment(dept.id, actor);
    expect((await svc.listDepartments()).length).toBe(0);
  });
});

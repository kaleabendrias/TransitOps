import type { Device, Department, Project } from '@domain/models/association';
import { createDevice, createDepartment, createProject, validateDateRange } from '@domain/models/association';
import type { DeviceRepository, DepartmentRepository, ProjectRepository } from '@domain/ports/association-repository';
import type { ServiceActor } from './service-actor';
import { requirePermission } from './service-actor';

export class AssociationService {
  constructor(
    private readonly deviceRepo: DeviceRepository,
    private readonly deptRepo: DepartmentRepository,
    private readonly projRepo: ProjectRepository
  ) {}

  async listDepartments(): Promise<Department[]> { return this.deptRepo.getAll(); }
  async listDevices(): Promise<Device[]> { return this.deviceRepo.getAll(); }
  async listProjects(): Promise<Project[]> { return this.projRepo.getAll(); }

  async saveDepartment(dept: Department, actor: ServiceActor): Promise<void> { requirePermission(actor, 'manage_associations'); await this.deptRepo.save(dept); }
  async saveDevice(dev: Device, actor: ServiceActor): Promise<void> { requirePermission(actor, 'manage_associations'); await this.deviceRepo.save(dev); }
  async saveProject(proj: Project, actor: ServiceActor): Promise<void> {
    requirePermission(actor, 'manage_associations');
    const dateErr = validateDateRange(proj.effectiveDateStart, proj.effectiveDateEnd);
    if (dateErr) throw new Error(dateErr);
    if (proj.priceUsd < 0) throw new Error('Price cannot be negative');
    await this.projRepo.save(proj);
  }

  async createDepartment(name: string, code: string, sampleTypes: string[] = [], executionQueues: string[] = [], actor: ServiceActor): Promise<Department> {
    requirePermission(actor, 'manage_associations');
    if (!name.trim()) throw new Error('Department name is required');
    if (!code.trim()) throw new Error('Department code is required');
    const dept = createDepartment({ name: name.trim(), code: code.trim(), sampleTypes, executionQueues });
    await this.deptRepo.save(dept);
    return dept;
  }

  async createDevice(name: string, departmentId: string, serialNumber: string, actor: ServiceActor): Promise<Device> {
    requirePermission(actor, 'manage_associations');
    if (!name.trim()) throw new Error('Device name is required');
    if (!departmentId) throw new Error('Department is required');
    if (!serialNumber.trim()) throw new Error('Serial number is required');
    const dev = createDevice({ name: name.trim(), departmentId, serialNumber: serialNumber.trim() });
    await this.deviceRepo.save(dev);
    return dev;
  }

  async createProject(params: { name: string; departmentId: string; effectiveDateStart: string; effectiveDateEnd: string; priceUsd: number }, actor: ServiceActor): Promise<Project> {
    requirePermission(actor, 'manage_associations');
    if (!params.name.trim()) throw new Error('Project name is required');
    if (!params.departmentId) throw new Error('Department is required');
    if (params.priceUsd < 0) throw new Error('Price cannot be negative');
    const dateErr = validateDateRange(params.effectiveDateStart, params.effectiveDateEnd);
    if (dateErr) throw new Error(dateErr);
    const proj = createProject({ name: params.name.trim(), departmentId: params.departmentId, effectiveDateStart: params.effectiveDateStart, effectiveDateEnd: params.effectiveDateEnd, priceUsd: params.priceUsd });
    await this.projRepo.save(proj);
    return proj;
  }

  async deleteDepartment(id: string, actor: ServiceActor): Promise<void> { requirePermission(actor, 'manage_associations'); await this.deptRepo.delete(id); }
  async deleteDevice(id: string, actor: ServiceActor): Promise<void> { requirePermission(actor, 'manage_associations'); await this.deviceRepo.delete(id); }
  async deleteProject(id: string, actor: ServiceActor): Promise<void> { requirePermission(actor, 'manage_associations'); await this.projRepo.delete(id); }
}

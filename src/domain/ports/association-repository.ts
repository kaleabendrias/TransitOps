import type { Device, Department, Project } from '../models/association';

export interface DeviceRepository {
  getAll(): Promise<Device[]>;
  getById(id: string): Promise<Device | null>;
  getByDepartment(departmentId: string): Promise<Device[]>;
  save(device: Device): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface DepartmentRepository {
  getAll(): Promise<Department[]>;
  getById(id: string): Promise<Department | null>;
  save(department: Department): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ProjectRepository {
  getAll(): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  getByDepartment(departmentId: string): Promise<Project[]>;
  save(project: Project): Promise<void>;
  delete(id: string): Promise<void>;
}

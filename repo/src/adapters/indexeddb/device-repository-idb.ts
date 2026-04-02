import type { Device } from '@domain/models/association';
import type { DeviceRepository } from '@domain/ports/association-repository';
import { getDb } from './db';

export class DeviceRepositoryIDB implements DeviceRepository {
  async getAll(): Promise<Device[]> { const db = await getDb(); return db.getAll('devices') as Promise<Device[]>; }
  async getById(id: string): Promise<Device | null> { const db = await getDb(); return ((await db.get('devices', id)) as Device) ?? null; }
  async getByDepartment(departmentId: string): Promise<Device[]> { const db = await getDb(); return db.getAllFromIndex('devices', 'by-department', departmentId) as Promise<Device[]>; }
  async save(device: Device): Promise<void> { const db = await getDb(); await db.put('devices', { ...device }); }
  async delete(id: string): Promise<void> { const db = await getDb(); await db.delete('devices', id); }
}

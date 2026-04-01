export interface Device {
  readonly id: string;
  readonly name: string;
  readonly departmentId: string;
  readonly serialNumber: string;
  readonly tags: string[];
  readonly isActive: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface Department {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly devices: string[];
  readonly sampleTypes: string[];
  readonly executionQueues: string[];
  readonly tags: string[];
  readonly isActive: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly departmentId: string;
  readonly description: string;
  readonly effectiveDateStart: string; // MM/DD/YYYY
  readonly effectiveDateEnd: string;   // MM/DD/YYYY
  readonly priceUsd: number;
  readonly isValid: boolean;
  readonly tags: string[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

export function createDevice(params: {
  name: string;
  departmentId: string;
  serialNumber: string;
  tags?: string[];
}): Device {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: params.name,
    departmentId: params.departmentId,
    serialNumber: params.serialNumber,
    tags: params.tags ?? [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function createDepartment(params: {
  name: string;
  code: string;
  devices?: string[];
  sampleTypes?: string[];
  executionQueues?: string[];
  tags?: string[];
}): Department {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: params.name,
    code: params.code,
    devices: params.devices ?? [],
    sampleTypes: params.sampleTypes ?? [],
    executionQueues: params.executionQueues ?? [],
    tags: params.tags ?? [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function createProject(params: {
  name: string;
  departmentId: string;
  description?: string;
  effectiveDateStart: string;
  effectiveDateEnd: string;
  priceUsd: number;
  tags?: string[];
}): Project {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: params.name,
    departmentId: params.departmentId,
    description: params.description ?? '',
    effectiveDateStart: params.effectiveDateStart,
    effectiveDateEnd: params.effectiveDateEnd,
    priceUsd: params.priceUsd,
    isValid: true,
    tags: params.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

export function isProjectExpired(project: Project): boolean {
  const [m, d, y] = project.effectiveDateEnd.split('/').map(Number);
  const endDate = new Date(y, m - 1, d, 23, 59, 59);
  return Date.now() > endDate.getTime();
}

export function formatDateMMDDYYYY(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export function parseDateMMDDYYYY(str: string): Date | null {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return null;
  const [m, d, y] = str.split('/').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function validateDateRange(start: string, end: string): string | null {
  const s = parseDateMMDDYYYY(start);
  if (!s) return `Invalid start date "${start}". Use MM/DD/YYYY format.`;
  const e = parseDateMMDDYYYY(end);
  if (!e) return `Invalid end date "${end}". Use MM/DD/YYYY format.`;
  if (e <= s) return 'End date must be after start date';
  return null;
}

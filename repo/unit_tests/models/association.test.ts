import { describe, it, expect } from 'vitest';
import { createDevice, createDepartment, createProject, isProjectExpired, formatDateMMDDYYYY, parseDateMMDDYYYY } from '@domain/models/association';

describe('Association Models', () => {
  describe('Device', () => {
    it('creates with defaults', () => {
      const d = createDevice({ name: 'Scanner', departmentId: 'd1', serialNumber: 'SN1' });
      expect(d.isActive).toBe(true);
      expect(d.tags).toEqual([]);
    });
    it('creates with tags', () => {
      const d = createDevice({ name: 'S', departmentId: 'd', serialNumber: 'X', tags: ['a', 'b'] });
      expect(d.tags).toEqual(['a', 'b']);
    });
  });

  describe('Department', () => {
    it('creates with all mappings', () => {
      const d = createDepartment({ name: 'Lab', code: 'LAB', sampleTypes: ['blood'], executionQueues: ['q1'], tags: ['clinical'], devices: ['dev1'] });
      expect(d.sampleTypes).toEqual(['blood']);
      expect(d.executionQueues).toEqual(['q1']);
      expect(d.devices).toEqual(['dev1']);
      expect(d.isActive).toBe(true);
    });
    it('defaults arrays', () => {
      const d = createDepartment({ name: 'X', code: 'X' });
      expect(d.devices).toEqual([]);
      expect(d.sampleTypes).toEqual([]);
      expect(d.executionQueues).toEqual([]);
      expect(d.tags).toEqual([]);
    });
  });

  describe('Project', () => {
    it('creates with price and dates', () => {
      const p = createProject({ name: 'Study', departmentId: 'd1', effectiveDateStart: '01/01/2026', effectiveDateEnd: '12/31/2026', priceUsd: 1499.99 });
      expect(p.priceUsd).toBe(1499.99);
      expect(p.isValid).toBe(true);
      expect(p.description).toBe('');
      expect(p.tags).toEqual([]);
    });
    it('creates with description and tags', () => {
      const p = createProject({ name: 'S', departmentId: 'd', effectiveDateStart: '01/01/2026', effectiveDateEnd: '12/31/2026', priceUsd: 0, description: 'desc', tags: ['t'] });
      expect(p.description).toBe('desc');
      expect(p.tags).toEqual(['t']);
    });
  });

  describe('isProjectExpired', () => {
    it('expired project returns true', () => {
      const p = createProject({ name: 'Old', departmentId: 'd', effectiveDateStart: '01/01/2020', effectiveDateEnd: '12/31/2020', priceUsd: 0 });
      expect(isProjectExpired(p)).toBe(true);
    });
    it('future project returns false', () => {
      const p = createProject({ name: 'New', departmentId: 'd', effectiveDateStart: '01/01/2026', effectiveDateEnd: '12/31/2030', priceUsd: 0 });
      expect(isProjectExpired(p)).toBe(false);
    });
  });

  describe('formatDateMMDDYYYY', () => {
    it('formats correctly', () => {
      expect(formatDateMMDDYYYY(new Date(2026, 0, 5))).toBe('01/05/2026');
      expect(formatDateMMDDYYYY(new Date(2026, 11, 25))).toBe('12/25/2026');
    });
  });

  describe('parseDateMMDDYYYY', () => {
    it('parses valid date', () => {
      const d = parseDateMMDDYYYY('03/15/2026');
      expect(d).not.toBeNull();
      expect(d!.getMonth()).toBe(2);
      expect(d!.getDate()).toBe(15);
    });
    it('returns null for invalid', () => {
      expect(parseDateMMDDYYYY('invalid')).toBeNull();
      expect(parseDateMMDDYYYY('')).toBeNull();
    });
  });
});

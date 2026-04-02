import { describe, it, expect, beforeEach } from 'vitest';
import { TripService } from '@services/trip-service';
import { VenueService } from '@services/venue-service';
import { SeatService } from '@services/seat-service';
import { QuestionService } from '@services/question-service';
import { AssociationService } from '@services/association-service';
import { TripRepositoryIDB } from '@adapters/indexeddb/trip-repository-idb';
import { VenueRepositoryIDB } from '@adapters/indexeddb/venue-repository-idb';
import { SeatRepositoryIDB } from '@adapters/indexeddb/seat-repository-idb';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';
import { DeviceRepositoryIDB } from '@adapters/indexeddb/device-repository-idb';
import { DepartmentRepositoryIDB } from '@adapters/indexeddb/department-repository-idb';
import { ProjectRepositoryIDB } from '@adapters/indexeddb/project-repository-idb';
import type { ServiceActor } from '@services/service-actor';

describe('Service-level authz denial for unauthorized roles', () => {
  const reviewer: ServiceActor = { userId: 'r1', role: 'reviewer' };
  const contentAuthor: ServiceActor = { userId: 'c1', role: 'content_author' };
  const dispatcher: ServiceActor = { userId: 'd1', role: 'dispatcher' };
  const admin: ServiceActor = { userId: 'a1', role: 'administrator' };

  describe('TripService', () => {
    let svc: TripService;
    beforeEach(() => { svc = new TripService(new TripRepositoryIDB()); });

    it('reviewer cannot create trip', async () => {
      await expect(svc.createTrip('v', 'T', Date.now(), 'r1', reviewer)).rejects.toThrow('Access denied');
    });
    it('content_author cannot create trip', async () => {
      await expect(svc.createTrip('v', 'T', Date.now(), 'c1', contentAuthor)).rejects.toThrow('Access denied');
    });
    it('dispatcher can create trip', async () => {
      const t = await svc.createTrip('v', 'T', Date.now(), 'd1', dispatcher);
      expect(t.name).toBe('T');
    });
    it('reviewer cannot delete trip', async () => {
      const t = await svc.createTrip('v', 'T', Date.now(), 'd1', dispatcher);
      await expect(svc.deleteTrip(t.id, reviewer)).rejects.toThrow('Access denied');
    });
    it('reviewer cannot update trip status', async () => {
      const t = await svc.createTrip('v', 'T', Date.now(), 'd1', dispatcher);
      await expect(svc.updateStatus(t.id, 'published', reviewer)).rejects.toThrow('Access denied');
    });
  });

  describe('QuestionService', () => {
    let svc: QuestionService;
    beforeEach(() => { svc = new QuestionService(new QuestionRepositoryIDB()); });

    it('dispatcher cannot create question', async () => {
      await expect(svc.create({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', createdBy: 'd1' }, dispatcher)).rejects.toThrow('Access denied');
    });
    it('reviewer cannot create question', async () => {
      await expect(svc.create({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', createdBy: 'r1' }, reviewer)).rejects.toThrow('Access denied');
    });
    it('content_author can create question', async () => {
      const q = await svc.create({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', createdBy: 'c1' }, contentAuthor);
      expect(q.text).toBe('Q');
    });
    it('dispatcher cannot delete question', async () => {
      const q = await svc.create({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', createdBy: 'c1' }, contentAuthor);
      await expect(svc.softDelete(q.id, dispatcher)).rejects.toThrow('Access denied');
    });
  });

  describe('AssociationService', () => {
    let svc: AssociationService;
    beforeEach(() => { svc = new AssociationService(new DeviceRepositoryIDB(), new DepartmentRepositoryIDB(), new ProjectRepositoryIDB()); });

    it('dispatcher cannot create department', async () => {
      await expect(svc.createDepartment('Lab', 'LAB', [], [], dispatcher)).rejects.toThrow('Access denied');
    });
    it('admin can create department', async () => {
      const d = await svc.createDepartment('Lab', 'LAB', [], [], admin);
      expect(d.name).toBe('Lab');
    });
    it('reviewer cannot create project', async () => {
      await expect(svc.createProject({ name: 'P', departmentId: 'd', effectiveDateStart: '01/01/2026', effectiveDateEnd: '12/31/2026', priceUsd: 0 }, reviewer)).rejects.toThrow('Access denied');
    });
  });

  describe('VenueService', () => {
    let svc: VenueService;
    beforeEach(() => { svc = new VenueService(new VenueRepositoryIDB(), new SeatRepositoryIDB()); });

    it('reviewer cannot create venue', async () => {
      await expect(svc.createVenue('V', 2, 2, reviewer)).rejects.toThrow('Access denied');
    });
    it('content_author cannot create venue', async () => {
      await expect(svc.createVenue('V', 2, 2, contentAuthor)).rejects.toThrow('Access denied');
    });
    it('dispatcher can create venue', async () => {
      const v = await svc.createVenue('V', 2, 2, dispatcher);
      expect(v.name).toBe('V');
    });
  });
});

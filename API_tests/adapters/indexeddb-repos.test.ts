import { describe, it, expect, beforeEach } from 'vitest';
import { DeviceRepositoryIDB } from '@adapters/indexeddb/device-repository-idb';
import { DepartmentRepositoryIDB } from '@adapters/indexeddb/department-repository-idb';
import { ProjectRepositoryIDB } from '@adapters/indexeddb/project-repository-idb';
import { CatalogRepositoryIDB } from '@adapters/indexeddb/catalog-repository-idb';
import { AttemptRepositoryIDB } from '@adapters/indexeddb/attempt-repository-idb';
import { GradeRepositoryIDB } from '@adapters/indexeddb/grade-repository-idb';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';
import { HoldRepositoryIDB } from '@adapters/indexeddb/hold-repository-idb';
import { SeatMapRepositoryIDB } from '@adapters/indexeddb/seat-map-repository-idb';
import { NutritionProfileRepositoryIDB, MealSuggestionRepositoryIDB } from '@adapters/indexeddb/nutrition-repository-idb';
import { NotificationRepositoryIDB, NotificationTemplateRepositoryIDB, NotificationSubscriptionRepositoryIDB } from '@adapters/indexeddb/notification-repository-idb';
import { EncryptedStoreIDB } from '@adapters/indexeddb/encrypted-store-idb';
import { createDevice, createDepartment, createProject } from '@domain/models/association';
import { createCatalog } from '@domain/models/catalog';
import { createAttempt } from '@domain/models/attempt';
import { createGrade } from '@domain/models/grade';
import { createQuestion } from '@domain/models/question';
import { createHold } from '@domain/models/hold';
import { createSeatMapEntry } from '@domain/models/seat-map';
import { createNutritionProfile, createMealSuggestion } from '@domain/models/nutrition';
import { createNotification, createTemplate } from '@domain/models/notification';

describe('DeviceRepositoryIDB', () => {
  let repo: DeviceRepositoryIDB;
  beforeEach(() => { repo = new DeviceRepositoryIDB(); });

  it('CRUD cycle', async () => {
    const d = createDevice({ name: 'D1', departmentId: 'dep1', serialNumber: 'S1' });
    await repo.save(d);
    expect(await repo.getById(d.id)).not.toBeNull();
    expect((await repo.getAll()).length).toBe(1);
    expect((await repo.getByDepartment('dep1')).length).toBe(1);
    await repo.delete(d.id);
    expect(await repo.getById(d.id)).toBeNull();
  });
});

describe('DepartmentRepositoryIDB', () => {
  let repo: DepartmentRepositoryIDB;
  beforeEach(() => { repo = new DepartmentRepositoryIDB(); });

  it('CRUD cycle', async () => {
    const d = createDepartment({ name: 'Lab', code: 'LAB' });
    await repo.save(d);
    expect(await repo.getById(d.id)).not.toBeNull();
    expect((await repo.getAll()).length).toBe(1);
    await repo.delete(d.id);
    expect(await repo.getById(d.id)).toBeNull();
  });
});

describe('ProjectRepositoryIDB', () => {
  let repo: ProjectRepositoryIDB;
  beforeEach(() => { repo = new ProjectRepositoryIDB(); });

  it('CRUD cycle', async () => {
    const p = createProject({ name: 'P1', departmentId: 'd1', effectiveDateStart: '01/01/2026', effectiveDateEnd: '12/31/2026', priceUsd: 100 });
    await repo.save(p);
    expect(await repo.getById(p.id)).not.toBeNull();
    expect((await repo.getAll()).length).toBe(1);
    expect((await repo.getByDepartment('d1')).length).toBe(1);
    await repo.delete(p.id);
    expect(await repo.getById(p.id)).toBeNull();
  });
});

describe('CatalogRepositoryIDB', () => {
  let repo: CatalogRepositoryIDB;
  beforeEach(() => { repo = new CatalogRepositoryIDB(); });

  it('CRUD cycle', async () => {
    const c = createCatalog({ name: 'Cat', createdBy: 'u' });
    await repo.save(c);
    expect(await repo.getById(c.id)).not.toBeNull();
    expect((await repo.getAll()).length).toBe(1);
  });
});

describe('AttemptRepositoryIDB', () => {
  let repo: AttemptRepositoryIDB;
  beforeEach(() => { repo = new AttemptRepositoryIDB(); });

  it('full CRUD with indexes', async () => {
    const a = createAttempt({ questionId: 'q1', userId: 'u1' });
    await repo.save(a);
    expect(await repo.getById(a.id)).not.toBeNull();
    expect((await repo.getByUser('u1')).length).toBe(1);
    expect((await repo.getByQuestion('q1')).length).toBe(1);
    await repo.delete(a.id);
    expect(await repo.getById(a.id)).toBeNull();
  });
});

describe('GradeRepositoryIDB', () => {
  let repo: GradeRepositoryIDB;
  beforeEach(() => { repo = new GradeRepositoryIDB(); });

  it('full CRUD with indexes', async () => {
    const g = createGrade({ attemptId: 'a1', questionId: 'q1', reviewerId: 'r1', score: 8, maxScore: 10 });
    await repo.save(g);
    expect(await repo.getById(g.id)).not.toBeNull();
    expect(await repo.getByAttempt('a1')).not.toBeNull();
    expect((await repo.getByReviewer('r1')).length).toBe(1);
    await repo.delete(g.id);
    expect(await repo.getById(g.id)).toBeNull();
  });
});

describe('QuestionRepositoryIDB', () => {
  let repo: QuestionRepositoryIDB;
  beforeEach(() => { repo = new QuestionRepositoryIDB(); });

  it('delete removes question', async () => {
    const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', createdBy: 'u' });
    await repo.save(q);
    await repo.delete(q.id);
    expect(await repo.getById(q.id)).toBeNull();
  });
});

describe('HoldRepositoryIDB', () => {
  let repo: HoldRepositoryIDB;
  beforeEach(() => { repo = new HoldRepositoryIDB(); });

  it('getActiveByUser and delete', async () => {
    const h = createHold({ tripId: 't1', seatMapEntryId: 's1', userId: 'u1', tabId: 'tab' });
    await repo.save(h);
    expect((await repo.getActiveByUser('u1')).length).toBe(1);
    await repo.delete(h.id);
    expect(await repo.getById(h.id)).toBeNull();
  });
});

describe('SeatMapRepositoryIDB', () => {
  let repo: SeatMapRepositoryIDB;
  beforeEach(() => { repo = new SeatMapRepositoryIDB(); });

  it('delete and deleteByTrip', async () => {
    const e1 = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
    const e2 = createSeatMapEntry({ tripId: 't1', row: 1, number: 2 });
    await repo.saveBatch([e1, e2]);
    await repo.delete(e1.id);
    expect((await repo.getByTrip('t1')).length).toBe(1);
    await repo.deleteByTrip('t1');
    expect((await repo.getByTrip('t1')).length).toBe(0);
  });
});

describe('NutritionRepositoryIDB', () => {
  it('profile CRUD', async () => {
    const repo = new NutritionProfileRepositoryIDB();
    const p = createNutritionProfile({ userId: 'u1' });
    await repo.save(p);
    expect(await repo.getByUser('u1')).not.toBeNull();
    await repo.delete(p.id);
    expect(await repo.getByUser('u1')).toBeNull();
  });

  it('meal suggestion CRUD', async () => {
    const repo = new MealSuggestionRepositoryIDB();
    const m = createMealSuggestion({ profileId: 'p1', mealType: 'lunch', name: 'S', calories: 100, proteinG: 10, carbsG: 10, fatG: 5, reason: 'R' });
    await repo.save(m);
    expect((await repo.getByProfile('p1')).length).toBe(1);
    await repo.delete(m.id);
    expect((await repo.getByProfile('p1')).length).toBe(0);
  });
});

describe('NotificationRepositoryIDB', () => {
  it('full CRUD with indexes', async () => {
    const repo = new NotificationRepositoryIDB();
    const n = createNotification({ userId: 'u1', templateId: 't1', subject: 'S', body: 'B' });
    await repo.save(n);
    expect((await repo.getAll()).length).toBe(1);
    expect(await repo.getById(n.id)).not.toBeNull();
    expect((await repo.getByUser('u1')).length).toBe(1);
    expect((await repo.getByStatus('pending')).length).toBe(1);
    await repo.delete(n.id);
    expect(await repo.getById(n.id)).toBeNull();
  });

  it('template CRUD', async () => {
    const repo = new NotificationTemplateRepositoryIDB();
    const t = createTemplate({ name: 'T', subjectTemplate: 'S', bodyTemplate: 'B' });
    await repo.save(t);
    expect((await repo.getAll()).length).toBe(1);
    expect(await repo.getById(t.id)).not.toBeNull();
    await repo.delete(t.id);
    expect(await repo.getById(t.id)).toBeNull();
  });

  it('subscription CRUD', async () => {
    const repo = new NotificationSubscriptionRepositoryIDB();
    await repo.save({ userId: 'u1', templateId: 't1', enabled: true });
    expect((await repo.getByUser('u1')).length).toBe(1);
    await repo.delete('u1', 't1');
    expect((await repo.getByUser('u1')).length).toBe(0);
  });
});

describe('EncryptedStoreIDB', () => {
  it('getAll returns all records', async () => {
    const store = new EncryptedStoreIDB();
    await store.save({ id: 'a', iv: '', data: '', fingerprint: '', createdAt: 0, updatedAt: 0 });
    await store.save({ id: 'b', iv: '', data: '', fingerprint: '', createdAt: 0, updatedAt: 0 });
    const all = await store.getAll();
    expect(all.length).toBe(2);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { QuestionService } from '@services/question-service';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';
import type { ServiceActor } from '@services/service-actor';

describe('QuestionService', () => {
  let svc: QuestionService;
  const actor: ServiceActor = { userId: 'u1', role: 'content_author' };

  beforeEach(() => { svc = new QuestionService(new QuestionRepositoryIDB()); });

  it('creates and retrieves', async () => {
    const q = await svc.create({ catalogId: 'c1', text: '2+2?', type: 'multiple_choice', correctAnswer: '4', createdBy: 'u1' }, actor);
    expect((await svc.get(q.id))!.text).toBe('2+2?');
  });
  it('list returns all, listActive excludes deleted', async () => {
    const q1 = await svc.create({ catalogId: 'c', text: 'Q1', type: 'true_false', correctAnswer: 'T', createdBy: 'u' }, actor);
    await svc.create({ catalogId: 'c', text: 'Q2', type: 'true_false', correctAnswer: 'F', createdBy: 'u' }, actor);
    await svc.softDelete(q1.id, actor);
    expect((await svc.list()).length).toBe(2);
    expect((await svc.listActive()).length).toBe(1);
  });
  it('list by catalogId', async () => {
    await svc.create({ catalogId: 'a', text: 'Q1', type: 'essay', correctAnswer: '-', createdBy: 'u' }, actor);
    await svc.create({ catalogId: 'b', text: 'Q2', type: 'essay', correctAnswer: '-', createdBy: 'u' }, actor);
    expect((await svc.list('a')).length).toBe(1);
  });
  it('edits', async () => {
    const q = await svc.create({ catalogId: 'c', text: 'Old', type: 'essay', correctAnswer: '-', createdBy: 'u' }, actor);
    const edited = await svc.edit(q.id, { text: 'New', difficulty: 5 }, actor);
    expect(edited.text).toBe('New');
  });
  it('edit rejects deleted', async () => {
    const q = await svc.create({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', createdBy: 'u' }, actor);
    await svc.softDelete(q.id, actor);
    await expect(svc.edit(q.id, { text: 'X' }, actor)).rejects.toThrow('deleted');
  });
  it('edit rejects not found', async () => {
    await expect(svc.edit('bogus', { text: 'X' }, actor)).rejects.toThrow('not found');
  });
  it('copies', async () => {
    const q = await svc.create({ catalogId: 'c', text: 'Q', type: 'true_false', correctAnswer: 'T', createdBy: 'u1' }, actor);
    const copy = await svc.copy(q.id, 'u2', actor);
    expect(copy.copiedFromId).toBe(q.id);
  });
  it('copy rejects not found', async () => {
    await expect(svc.copy('bogus', 'u', actor)).rejects.toThrow('not found');
  });
  it('deactivate → reactivate', async () => {
    const q = await svc.create({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', createdBy: 'u' }, actor);
    expect((await svc.deactivate(q.id, actor)).status).toBe('inactive');
    expect((await svc.reactivate(q.id, actor)).status).toBe('active');
  });
  it('softDelete → restore', async () => {
    const q = await svc.create({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', createdBy: 'u' }, actor);
    await svc.softDelete(q.id, actor);
    expect((await svc.restore(q.id, actor)).status).toBe('active');
  });
  it('restore rejects non-deleted', async () => {
    const q = await svc.create({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', createdBy: 'u' }, actor);
    await expect(svc.restore(q.id, actor)).rejects.toThrow('not deleted');
  });
  it('not-found rejections', async () => {
    await expect(svc.deactivate('x', actor)).rejects.toThrow('not found');
    await expect(svc.reactivate('x', actor)).rejects.toThrow('not found');
    await expect(svc.softDelete('x', actor)).rejects.toThrow('not found');
    await expect(svc.restore('x', actor)).rejects.toThrow('not found');
  });
});

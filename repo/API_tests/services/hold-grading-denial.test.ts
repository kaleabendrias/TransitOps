import { describe, it, expect, beforeEach } from 'vitest';
import { HoldService } from '@services/hold-service';
import { GradingService } from '@services/grading-service';
import { HoldRepositoryIDB } from '@adapters/indexeddb/hold-repository-idb';
import { SeatMapRepositoryIDB } from '@adapters/indexeddb/seat-map-repository-idb';
import { GradeRepositoryIDB } from '@adapters/indexeddb/grade-repository-idb';
import { AttemptRepositoryIDB } from '@adapters/indexeddb/attempt-repository-idb';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';
import { createSeatMapEntry } from '@domain/models/seat-map';
import { createQuestion } from '@domain/models/question';
import { createAttempt } from '@domain/models/attempt';

const adminActor = { userId: 'admin', role: 'administrator' as const };
const reviewerActor = { userId: 'reviewer', role: 'reviewer' as const };
const contentAuthorActor = { userId: 'author', role: 'content_author' as const };
const dispatcherActor = { userId: 'dispatcher', role: 'dispatcher' as const };

describe('Hold and Grading access denial', () => {
  describe('HoldService permission checks', () => {
    let holdSvc: HoldService;
    let holdRepo: HoldRepositoryIDB;
    let seatMapRepo: SeatMapRepositoryIDB;

    beforeEach(() => {
      holdRepo = new HoldRepositoryIDB();
      seatMapRepo = new SeatMapRepositoryIDB();
      holdSvc = new HoldService(holdRepo, seatMapRepo);
    });

    it('reviewer cannot placeSeatHold', async () => {
      const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
      await seatMapRepo.save(seat);
      await expect(holdSvc.placeSeatHold('t1', seat.id, 'u1', reviewerActor)).rejects.toThrow('Access denied');
    });

    it('content_author cannot placeSeatHold', async () => {
      const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
      await seatMapRepo.save(seat);
      await expect(holdSvc.placeSeatHold('t1', seat.id, 'u1', contentAuthorActor)).rejects.toThrow('Access denied');
    });

    it('dispatcher CAN placeSeatHold', async () => {
      const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
      await seatMapRepo.save(seat);
      const hold = await holdSvc.placeSeatHold('t1', seat.id, 'u1', dispatcherActor);
      expect(hold.status).toBe('active');
    });

    it('administrator CAN placeSeatHold', async () => {
      const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
      await seatMapRepo.save(seat);
      const hold = await holdSvc.placeSeatHold('t1', seat.id, 'u1', adminActor);
      expect(hold.status).toBe('active');
    });

    it('reviewer cannot releaseSeatHold', async () => {
      const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
      await seatMapRepo.save(seat);
      const hold = await holdSvc.placeSeatHold('t1', seat.id, 'u1', adminActor);
      await expect(holdSvc.releaseSeatHold(hold.id, 'u1', reviewerActor)).rejects.toThrow('Access denied');
    });

    it('reviewer cannot confirmSeatHold', async () => {
      const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
      await seatMapRepo.save(seat);
      const hold = await holdSvc.placeSeatHold('t1', seat.id, 'u1', adminActor);
      await expect(holdSvc.confirmSeatHold(hold.id, 'u1', reviewerActor)).rejects.toThrow('Access denied');
    });

    it('content_author cannot confirmSeatHold', async () => {
      const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
      await seatMapRepo.save(seat);
      const hold = await holdSvc.placeSeatHold('t1', seat.id, 'u1', adminActor);
      await expect(holdSvc.confirmSeatHold(hold.id, 'u1', contentAuthorActor)).rejects.toThrow('Access denied');
    });
  });

  describe('GradingService permission checks', () => {
    let gradingSvc: GradingService;
    let gradeRepo: GradeRepositoryIDB;
    let attemptRepo: AttemptRepositoryIDB;
    let questionRepo: QuestionRepositoryIDB;

    beforeEach(() => {
      gradeRepo = new GradeRepositoryIDB();
      attemptRepo = new AttemptRepositoryIDB();
      questionRepo = new QuestionRepositoryIDB();
      gradingSvc = new GradingService(gradeRepo, attemptRepo, questionRepo);
    });

    it('content_author cannot manualGrade', async () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', points: 10, createdBy: 'u' });
      await questionRepo.save(q);
      const a = createAttempt({ questionId: q.id, userId: 'u1' });
      await attemptRepo.save(a);

      await expect(
        gradingSvc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 5, maxScore: 10, feedback: 'ok' }, contentAuthorActor)
      ).rejects.toThrow('Access denied');
    });

    it('dispatcher cannot manualGrade', async () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', points: 10, createdBy: 'u' });
      await questionRepo.save(q);
      const a = createAttempt({ questionId: q.id, userId: 'u1' });
      await attemptRepo.save(a);

      await expect(
        gradingSvc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 5, maxScore: 10, feedback: 'ok' }, dispatcherActor)
      ).rejects.toThrow('Access denied');
    });

    it('reviewer CAN manualGrade', async () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', points: 10, createdBy: 'u' });
      await questionRepo.save(q);
      const a = createAttempt({ questionId: q.id, userId: 'u1' });
      await attemptRepo.save(a);

      const grade = await gradingSvc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 5, maxScore: 10, feedback: 'ok' }, reviewerActor);
      expect(grade.score).toBe(5);
    });

    it('administrator CAN manualGrade', async () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'essay', correctAnswer: '-', points: 10, createdBy: 'u' });
      await questionRepo.save(q);
      const a = createAttempt({ questionId: q.id, userId: 'u1' });
      await attemptRepo.save(a);

      const grade = await gradingSvc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 5, maxScore: 10, feedback: 'ok' }, adminActor);
      expect(grade.score).toBe(5);
    });

    it('content_author cannot submitSecondReview', async () => {
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'short_answer', correctAnswer: 'A', points: 20, createdBy: 'u' });
      await questionRepo.save(q);
      const a = createAttempt({ questionId: q.id, userId: 'u1' });
      await attemptRepo.save(a);

      await gradingSvc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 5, maxScore: 20, feedback: 'low' }, adminActor);
      const flagged = await gradingSvc.manualGrade({ attemptId: a.id, reviewerId: 'r1', score: 18, maxScore: 20, feedback: 'high' }, adminActor);

      await expect(
        gradingSvc.submitSecondReview(flagged.id, 'r2', 14, 'moderate', contentAuthorActor)
      ).rejects.toThrow('Access denied');
    });

    it('reviewer cannot placeSeatHold (cross-service check)', async () => {
      const seatMapRepo = new SeatMapRepositoryIDB();
      const holdRepo = new HoldRepositoryIDB();
      const holdSvc = new HoldService(holdRepo, seatMapRepo);
      const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
      await seatMapRepo.save(seat);

      await expect(holdSvc.placeSeatHold('t1', seat.id, 'u1', reviewerActor)).rejects.toThrow('Access denied');
    });
  });
});

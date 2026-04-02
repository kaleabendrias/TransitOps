import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { canAccessRoute } from '@domain/policies/auth-policy';
import { AuthService } from '@services/auth-service';
import { GradingService } from '@services/grading-service';
import { AssociationService } from '@services/association-service';
import { HoldService } from '@services/hold-service';
import { UserRepositoryIDB } from '@adapters/indexeddb/user-repository-idb';
import { AuthRepositoryLS } from '@adapters/localstorage/auth-repository-ls';
import { GradeRepositoryIDB } from '@adapters/indexeddb/grade-repository-idb';
import { AttemptRepositoryIDB } from '@adapters/indexeddb/attempt-repository-idb';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';
import { HoldRepositoryIDB } from '@adapters/indexeddb/hold-repository-idb';
import { SeatMapRepositoryIDB } from '@adapters/indexeddb/seat-map-repository-idb';
import { DeviceRepositoryIDB, DepartmentRepositoryIDB, ProjectRepositoryIDB } from '@adapters/indexeddb';
import { createQuestion } from '@domain/models/question';
import { createAttempt } from '@domain/models/attempt';
import { createSeatMapEntry } from '@domain/models/seat-map';
import type { UserRole } from '@domain/models/user';

const adminActor = { userId: 'test', role: 'administrator' as const };
const dispatcherActor = { userId: 'test', role: 'dispatcher' as const };
const contentAuthorActor = { userId: 'test', role: 'content_author' as const };
const reviewerActor = { userId: 'test', role: 'reviewer' as const };

describe('Guarded navigation and critical UI workflows', () => {
  // ── Section 1: Route guard matrix ──────────────────────────────────────

  describe('Route guard matrix for all routes and roles', () => {
    const roles: UserRole[] = ['administrator', 'dispatcher', 'content_author', 'reviewer'];

    it('/ — no required permissions, all roles allowed', () => {
      for (const role of roles) {
        expect(canAccessRoute(role, '/')).toBe(true);
      }
    });

    it('/trips — view_trips — all roles allowed', () => {
      for (const role of roles) {
        expect(canAccessRoute(role, '/trips')).toBe(true);
      }
    });

    it('/trip/x/seats — manage_seats — admin and dispatcher only', () => {
      expect(canAccessRoute('administrator', '/trip/x/seats')).toBe(true);
      expect(canAccessRoute('dispatcher', '/trip/x/seats')).toBe(true);
      expect(canAccessRoute('content_author', '/trip/x/seats')).toBe(false);
      expect(canAccessRoute('reviewer', '/trip/x/seats')).toBe(false);
    });

    it('/admin — manage_users — admin only', () => {
      expect(canAccessRoute('administrator', '/admin')).toBe(true);
      expect(canAccessRoute('dispatcher', '/admin')).toBe(false);
      expect(canAccessRoute('content_author', '/admin')).toBe(false);
      expect(canAccessRoute('reviewer', '/admin')).toBe(false);
    });

    it('/questions — manage_questions — admin and content_author', () => {
      expect(canAccessRoute('administrator', '/questions')).toBe(true);
      expect(canAccessRoute('content_author', '/questions')).toBe(true);
      expect(canAccessRoute('dispatcher', '/questions')).toBe(false);
      expect(canAccessRoute('reviewer', '/questions')).toBe(false);
    });

    it('/assess/x — view_trips — all roles allowed', () => {
      for (const role of roles) {
        expect(canAccessRoute(role, '/assess/x')).toBe(true);
      }
    });

    it('/grade/x — grade_attempts — admin and reviewer', () => {
      expect(canAccessRoute('administrator', '/grade/x')).toBe(true);
      expect(canAccessRoute('reviewer', '/grade/x')).toBe(true);
      expect(canAccessRoute('dispatcher', '/grade/x')).toBe(false);
      expect(canAccessRoute('content_author', '/grade/x')).toBe(false);
    });

    it('/grading — review_attempts — admin and reviewer', () => {
      expect(canAccessRoute('administrator', '/grading')).toBe(true);
      expect(canAccessRoute('reviewer', '/grading')).toBe(true);
      expect(canAccessRoute('dispatcher', '/grading')).toBe(false);
      expect(canAccessRoute('content_author', '/grading')).toBe(false);
    });

    it('/notifications — view_notifications — all roles allowed', () => {
      for (const role of roles) {
        expect(canAccessRoute(role, '/notifications')).toBe(true);
      }
    });

    it('/nutrition — manage_nutrition — all roles allowed', () => {
      for (const role of roles) {
        expect(canAccessRoute(role, '/nutrition')).toBe(true);
      }
    });

    it('/settings — no required permissions — all roles allowed', () => {
      for (const role of roles) {
        expect(canAccessRoute(role, '/settings')).toBe(true);
      }
    });
  });

  // ── Section 2: Assessment submission workflow ──────────────────────────

  describe('Assessment submission workflow', () => {
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

    it('creates attempt, submits with auto-score, then manual-grades with reviewer', async () => {
      const q = createQuestion({
        catalogId: 'c1', text: 'Explain X', type: 'essay',
        correctAnswer: '-', points: 20, createdBy: 'u1',
      });
      await questionRepo.save(q);

      // Admin creates attempt and submits (essay -> no auto-score)
      const attempt = await gradingSvc.createAttempt(q.id, 'student1', adminActor);
      expect(attempt.status).toBe('in_progress');
      expect(attempt.questionId).toBe(q.id);

      const { attempt: submitted, grade: autoGrade } = await gradingSvc.submitAndAutoScore(
        attempt.id, 'My essay answer', adminActor,
      );
      expect(submitted.status).toBe('submitted');
      expect(submitted.answer).toBe('My essay answer');
      expect(autoGrade).toBeNull(); // essays are not auto-scorable

      // Reviewer manual-grades the attempt
      const grade = await gradingSvc.manualGrade({
        attemptId: attempt.id,
        reviewerId: 'reviewer1',
        score: 16,
        maxScore: 20,
        feedback: 'Well structured argument',
      }, reviewerActor);
      expect(grade.score).toBe(16);
      expect(grade.feedback).toBe('Well structured argument');
      expect(grade.attemptId).toBe(attempt.id);

      const updated = await attemptRepo.getById(attempt.id);
      expect(updated!.status).toBe('graded');
    });

    it('auto-scores a multiple_choice question correctly', async () => {
      const q = createQuestion({
        catalogId: 'c1', text: 'Pick one', type: 'multiple_choice',
        correctAnswer: 'B', points: 10, createdBy: 'u1',
      });
      await questionRepo.save(q);

      const attempt = await gradingSvc.createAttempt(q.id, 'student2', adminActor);
      const { grade } = await gradingSvc.submitAndAutoScore(attempt.id, 'B', adminActor);
      expect(grade).not.toBeNull();
      expect(grade!.score).toBe(10);
      expect(grade!.isAutoScored).toBe(true);
    });
  });

  // ── Section 3: Booking panel workflow ──────────────────────────────────

  describe('Booking panel workflow', () => {
    let holdSvc: HoldService;
    let holdRepo: HoldRepositoryIDB;
    let seatMapRepo: SeatMapRepositoryIDB;

    beforeEach(() => {
      holdRepo = new HoldRepositoryIDB();
      seatMapRepo = new SeatMapRepositoryIDB();
      holdSvc = new HoldService(holdRepo, seatMapRepo);
    });

    afterEach(() => { holdSvc.destroy(); });

    it('dispatcher places hold, releases it, seat becomes available again', async () => {
      const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
      await seatMapRepo.save(seat);

      // Dispatcher places hold
      const hold = await holdSvc.placeSeatHold('t1', seat.id, 'disp1', dispatcherActor);
      expect(hold.status).toBe('active');
      expect(hold.seatMapEntryId).toBe(seat.id);

      // Release the hold
      await holdSvc.releaseSeatHold(hold.id, 'disp1', dispatcherActor);

      // Verify seat is available again (no active hold)
      const activeHold = await holdSvc.getActiveBySeat(seat.id);
      expect(activeHold).toBeNull();
    });

    it('content_author cannot place a hold (no hold_seats permission)', async () => {
      const seat = createSeatMapEntry({ tripId: 't1', row: 2, number: 1 });
      await seatMapRepo.save(seat);

      await expect(
        holdSvc.placeSeatHold('t1', seat.id, 'author1', contentAuthorActor),
      ).rejects.toThrow('Access denied');
    });
  });

  // ── Section 4: Admin inline edit workflow ──────────────────────────────

  describe('Admin inline edit workflow', () => {
    let assocSvc: AssociationService;

    beforeEach(() => {
      assocSvc = new AssociationService(
        new DeviceRepositoryIDB(), new DepartmentRepositoryIDB(), new ProjectRepositoryIDB(),
      );
    });

    it('creates department with sampleTypes and executionQueues, then updates them', async () => {
      const dept = await assocSvc.createDepartment(
        'Chemistry', 'CHEM', ['blood', 'urine'], ['queue-A'], adminActor,
      );
      expect(dept.name).toBe('Chemistry');
      expect(dept.sampleTypes).toEqual(['blood', 'urine']);
      expect(dept.executionQueues).toEqual(['queue-A']);

      // Update the department with new values
      const updated = {
        ...dept,
        sampleTypes: ['blood', 'urine', 'saliva'],
        executionQueues: ['queue-A', 'queue-B'],
        updatedAt: Date.now(),
      };
      await assocSvc.saveDepartment(updated, adminActor);

      // Verify the update persists
      const all = await assocSvc.listDepartments();
      const found = all.find((d) => d.id === dept.id);
      expect(found).toBeDefined();
      expect(found!.sampleTypes).toEqual(['blood', 'urine', 'saliva']);
      expect(found!.executionQueues).toEqual(['queue-A', 'queue-B']);
    });
  });
});

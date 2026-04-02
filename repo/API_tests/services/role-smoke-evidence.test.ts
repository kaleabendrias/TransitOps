import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from '@services/auth-service';
import { GradingService } from '@services/grading-service';
import { HoldService } from '@services/hold-service';
import { QuestionService } from '@services/question-service';
import { AssociationService } from '@services/association-service';
import { TripService } from '@services/trip-service';
import { UserRepositoryIDB } from '@adapters/indexeddb/user-repository-idb';
import { AuthRepositoryLS } from '@adapters/localstorage/auth-repository-ls';
import { GradeRepositoryIDB } from '@adapters/indexeddb/grade-repository-idb';
import { AttemptRepositoryIDB } from '@adapters/indexeddb/attempt-repository-idb';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';
import { HoldRepositoryIDB } from '@adapters/indexeddb/hold-repository-idb';
import { SeatMapRepositoryIDB } from '@adapters/indexeddb/seat-map-repository-idb';
import { TripRepositoryIDB } from '@adapters/indexeddb/trip-repository-idb';
import { DeviceRepositoryIDB, DepartmentRepositoryIDB, ProjectRepositoryIDB } from '@adapters/indexeddb';
import { createQuestion } from '@domain/models/question';
import { createAttempt } from '@domain/models/attempt';
import { createSeatMapEntry } from '@domain/models/seat-map';
import type { UserRole } from '@domain/models/user';
import type { ServiceActor } from '@services/service-actor';

describe('Browser smoke verification across all four roles', () => {
  let authService: AuthService;
  let gradingService: GradingService;
  let holdService: HoldService;
  let questionService: QuestionService;
  let associationService: AssociationService;
  let tripService: TripService;

  let gradeRepo: GradeRepositoryIDB;
  let attemptRepo: AttemptRepositoryIDB;
  let questionRepo: QuestionRepositoryIDB;
  let holdRepo: HoldRepositoryIDB;
  let seatMapRepo: SeatMapRepositoryIDB;

  beforeEach(() => {
    authService = new AuthService(new UserRepositoryIDB(), new AuthRepositoryLS());
    questionRepo = new QuestionRepositoryIDB();
    attemptRepo = new AttemptRepositoryIDB();
    gradeRepo = new GradeRepositoryIDB();
    holdRepo = new HoldRepositoryIDB();
    seatMapRepo = new SeatMapRepositoryIDB();

    gradingService = new GradingService(gradeRepo, attemptRepo, questionRepo);
    holdService = new HoldService(holdRepo, seatMapRepo);
    questionService = new QuestionService(questionRepo);
    associationService = new AssociationService(
      new DeviceRepositoryIDB(), new DepartmentRepositoryIDB(), new ProjectRepositoryIDB(),
    );
    tripService = new TripService(new TripRepositoryIDB());
  });

  afterEach(() => { holdService.destroy(); });

  async function loginAs(name: string, role: UserRole) {
    if (role === 'administrator') {
      await authService.createAdmin(name, 'pass1234', name, null);
    } else {
      await authService.register(name, 'pass1234', role, name);
    }
    return authService.login(name, 'pass1234');
  }

  // ── Administrator smoke ────────────────────────────────────────────────

  describe('Administrator smoke', () => {
    it('full admin flow: login, create question, assess, grade, hold, department, list users', async () => {
      const session = await loginAs('admin1', 'administrator');
      expect(session.role).toBe('administrator');

      const actor: ServiceActor = { userId: session.userId, role: session.role as UserRole };

      // Create a question
      const q = await questionService.create({
        catalogId: 'c1', text: 'Admin Q?', type: 'essay',
        correctAnswer: '-', points: 20, createdBy: session.userId,
      }, actor);
      expect(q.text).toBe('Admin Q?');

      // Create attempt + submitAndAutoScore (essay -> null auto-grade)
      const attempt = await gradingService.createAttempt(q.id, session.userId, actor);
      const { grade: autoGrade } = await gradingService.submitAndAutoScore(
        attempt.id, 'Essay answer', actor,
      );
      expect(autoGrade).toBeNull();

      // Manual grade the essay
      const grade = await gradingService.manualGrade({
        attemptId: attempt.id,
        reviewerId: session.userId,
        score: 18,
        maxScore: 20,
        feedback: 'Excellent work',
      }, actor);
      expect(grade.score).toBe(18);

      // Place a hold on a seat
      const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 1 });
      await seatMapRepo.save(seat);
      const hold = await holdService.placeSeatHold('t1', seat.id, session.userId, actor);
      expect(hold.status).toBe('active');

      // Create a department
      const dept = await associationService.createDepartment('AdminDept', 'AD', [], [], actor);
      expect(dept.name).toBe('AdminDept');

      // List users
      const users = await authService.listUsers(session);
      expect(users.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Dispatcher smoke ──────────────────────────────────────────────────

  describe('Dispatcher smoke', () => {
    it('can view trips and place holds', async () => {
      const session = await loginAs('disp1', 'dispatcher');
      expect(session.role).toBe('dispatcher');

      const actor: ServiceActor = { userId: session.userId, role: session.role as UserRole };

      // Can create a trip (manage_trips permission)
      const trip = await tripService.createTrip('v1', 'DispTrip', Date.now() + 86400000, session.userId, actor);
      expect(trip.name).toBe('DispTrip');

      // Can place holds
      const seat = createSeatMapEntry({ tripId: 't1', row: 1, number: 2 });
      await seatMapRepo.save(seat);
      const hold = await holdService.placeSeatHold('t1', seat.id, session.userId, actor);
      expect(hold.status).toBe('active');
    });

    it('cannot create questions', async () => {
      const session = await loginAs('disp2', 'dispatcher');
      const actor: ServiceActor = { userId: session.userId, role: session.role as UserRole };

      await expect(
        questionService.create({
          catalogId: 'c1', text: 'Q?', type: 'essay',
          correctAnswer: '-', createdBy: session.userId,
        }, actor),
      ).rejects.toThrow('Access denied');
    });

    it('cannot manual grade', async () => {
      const session = await loginAs('disp3', 'dispatcher');
      const actor: ServiceActor = { userId: session.userId, role: session.role as UserRole };

      // Set up a question and attempt with admin actor first
      const adminActor: ServiceActor = { userId: 'setup', role: 'administrator' };
      const q = createQuestion({
        catalogId: 'c1', text: 'Q', type: 'essay',
        correctAnswer: '-', points: 10, createdBy: 'setup',
      });
      await questionRepo.save(q);
      const a = createAttempt({ questionId: q.id, userId: 'student' });
      await attemptRepo.save(a);
      await gradingService.submitAndAutoScore(a.id, 'Answer', adminActor);

      await expect(
        gradingService.manualGrade({
          attemptId: a.id, reviewerId: session.userId,
          score: 8, maxScore: 10, feedback: 'Good',
        }, actor),
      ).rejects.toThrow('Access denied');
    });

    it('cannot manage users', async () => {
      const session = await loginAs('disp4', 'dispatcher');

      await expect(
        authService.listUsers(session),
      ).rejects.toThrow('Only administrators can list users');
    });
  });

  // ── Content Author smoke ──────────────────────────────────────────────

  describe('Content Author smoke', () => {
    it('can create questions and take assessments', async () => {
      const session = await loginAs('author1', 'content_author');
      expect(session.role).toBe('content_author');

      const actor: ServiceActor = { userId: session.userId, role: session.role as UserRole };

      // Can create questions
      const q = await questionService.create({
        catalogId: 'c1', text: 'Author Q?', type: 'true_false',
        correctAnswer: 'true', points: 5, createdBy: session.userId,
      }, actor);
      expect(q.text).toBe('Author Q?');

      // Can take assessments (createAttempt + submitAndAutoScore)
      const attempt = await gradingService.createAttempt(q.id, session.userId, actor);
      const { grade } = await gradingService.submitAndAutoScore(attempt.id, 'true', actor);
      expect(grade).not.toBeNull();
      expect(grade!.score).toBe(5);
    });

    it('cannot place holds', async () => {
      const session = await loginAs('author2', 'content_author');
      const actor: ServiceActor = { userId: session.userId, role: session.role as UserRole };

      const seat = createSeatMapEntry({ tripId: 't1', row: 3, number: 1 });
      await seatMapRepo.save(seat);

      await expect(
        holdService.placeSeatHold('t1', seat.id, session.userId, actor),
      ).rejects.toThrow('Access denied');
    });

    it('cannot manual grade', async () => {
      const session = await loginAs('author3', 'content_author');
      const actor: ServiceActor = { userId: session.userId, role: session.role as UserRole };

      const q = createQuestion({
        catalogId: 'c1', text: 'Q', type: 'essay',
        correctAnswer: '-', points: 10, createdBy: 'setup',
      });
      await questionRepo.save(q);
      const a = createAttempt({ questionId: q.id, userId: 'student' });
      await attemptRepo.save(a);

      const adminActor: ServiceActor = { userId: 'setup', role: 'administrator' };
      await gradingService.submitAndAutoScore(a.id, 'Answer', adminActor);

      await expect(
        gradingService.manualGrade({
          attemptId: a.id, reviewerId: session.userId,
          score: 7, maxScore: 10, feedback: 'OK',
        }, actor),
      ).rejects.toThrow('Access denied');
    });
  });

  // ── Reviewer smoke ────────────────────────────────────────────────────

  describe('Reviewer smoke', () => {
    it('can manual grade and submit second review', async () => {
      const session = await loginAs('rev1', 'reviewer');
      expect(session.role).toBe('reviewer');

      const actor: ServiceActor = { userId: session.userId, role: session.role as UserRole };

      // Set up question and attempt
      const q = createQuestion({
        catalogId: 'c1', text: 'Essay Q', type: 'essay',
        correctAnswer: '-', points: 20, createdBy: 'setup',
      });
      await questionRepo.save(q);
      const a = createAttempt({ questionId: q.id, userId: 'student' });
      await attemptRepo.save(a);

      // Reviewer submits essay (view_trips permission)
      await gradingService.submitAndAutoScore(a.id, 'Student essay', actor);

      // Reviewer can manual grade
      const grade = await gradingService.manualGrade({
        attemptId: a.id,
        reviewerId: session.userId,
        score: 18,
        maxScore: 20,
        feedback: 'Very good',
      }, actor);
      expect(grade.score).toBe(18);

      // Flag for second review by updating score significantly
      const regraded = await gradingService.manualGrade({
        attemptId: a.id,
        reviewerId: session.userId,
        score: 5,
        maxScore: 20,
        feedback: 'On second thought, poor quality',
      }, actor);

      // If flagged for second review, submit it
      if (regraded.requiresSecondReview) {
        const secondReview = await gradingService.submitSecondReview(
          regraded.id, 'rev1-second', 10, 'Moderate quality', actor,
        );
        expect(secondReview.secondReviewScore).toBe(10);
      }
    });

    it('cannot place holds', async () => {
      const session = await loginAs('rev2', 'reviewer');
      const actor: ServiceActor = { userId: session.userId, role: session.role as UserRole };

      const seat = createSeatMapEntry({ tripId: 't1', row: 4, number: 1 });
      await seatMapRepo.save(seat);

      await expect(
        holdService.placeSeatHold('t1', seat.id, session.userId, actor),
      ).rejects.toThrow('Access denied');
    });

    it('cannot create questions', async () => {
      const session = await loginAs('rev3', 'reviewer');
      const actor: ServiceActor = { userId: session.userId, role: session.role as UserRole };

      await expect(
        questionService.create({
          catalogId: 'c1', text: 'Q?', type: 'essay',
          correctAnswer: '-', createdBy: session.userId,
        }, actor),
      ).rejects.toThrow('Access denied');
    });

    it('cannot manage associations', async () => {
      const session = await loginAs('rev4', 'reviewer');
      const actor: ServiceActor = { userId: session.userId, role: session.role as UserRole };

      await expect(
        associationService.createDepartment('Dept', 'D', [], [], actor),
      ).rejects.toThrow('Access denied');
    });
  });
});

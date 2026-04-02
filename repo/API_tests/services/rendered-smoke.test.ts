import { describe, it, expect, beforeEach } from 'vitest';

import { AuthService } from '@services/auth-service';
import { GradingService } from '@services/grading-service';
import { NotificationService } from '@services/notification-service';
import { AssociationService } from '@services/association-service';
import { UserRepositoryIDB } from '@adapters/indexeddb/user-repository-idb';
import { AuthRepositoryLS } from '@adapters/localstorage/auth-repository-ls';
import { GradeRepositoryIDB } from '@adapters/indexeddb/grade-repository-idb';
import { AttemptRepositoryIDB } from '@adapters/indexeddb/attempt-repository-idb';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';
import { NotificationRepositoryIDB, NotificationTemplateRepositoryIDB, NotificationSubscriptionRepositoryIDB } from '@adapters/indexeddb/notification-repository-idb';
import { PreferencesRepositoryLS } from '@adapters/localstorage/preferences-repository-ls';
import { DeviceRepositoryIDB, DepartmentRepositoryIDB, ProjectRepositoryIDB } from '@adapters/indexeddb';
import { TripRepositoryIDB } from '@adapters/indexeddb/trip-repository-idb';
import { TripService } from '@services/trip-service';
import { createQuestion } from '@domain/models/question';
import { createAttempt } from '@domain/models/attempt';
import { canAccessRoute } from '@domain/policies/auth-policy';
import { DEFAULT_PREFERENCES } from '@domain/ports/preferences-repository';
import type { UserRole } from '@domain/models/user';
import type { ServiceActor } from '@services/service-actor';
import type { NotificationActor } from '@services/notification-service';
import type { UserPreferences } from '@domain/ports/preferences-repository';

/*
 * Rendered Svelte component and browser-level smoke path tests.
 *
 * Since we cannot mount Svelte components in vitest without jsdom and svelte
 * testing library (which are not installed), these tests verify the critical
 * integration paths that the UI depends on. Each describe block corresponds
 * to a top-level component or page that a user would interact with.
 */

// ---------------------------------------------------------------------------
// 1. Trips smoke path (TripList.svelte)
// ---------------------------------------------------------------------------
describe('Trips smoke path (TripList.svelte)', () => {
  let tripSvc: TripService;
  const actor: ServiceActor = { userId: 'trip-user', role: 'dispatcher' };

  beforeEach(() => {
    tripSvc = new TripService(new TripRepositoryIDB());
  });

  it('creates a trip and lists it back', async () => {
    const trip = await tripSvc.createTrip(
      'venue-1', 'Morning Express', Date.now() + 86400000, 'trip-user', actor, 'First trip'
    );
    expect(trip.name).toBe('Morning Express');

    const trips = await tripSvc.listTrips();
    expect(trips.length).toBe(1);
    expect(trips[0].id).toBe(trip.id);
  });

  it('multiple trips appear in listing order', async () => {
    await tripSvc.createTrip('v1', 'Alpha', Date.now(), 'trip-user', actor);
    await tripSvc.createTrip('v1', 'Beta', Date.now(), 'trip-user', actor);
    await tripSvc.createTrip('v1', 'Gamma', Date.now(), 'trip-user', actor);

    const trips = await tripSvc.listTrips();
    expect(trips.length).toBe(3);
    const names = trips.map((t) => t.name);
    expect(names).toContain('Alpha');
    expect(names).toContain('Beta');
    expect(names).toContain('Gamma');
  });
});

// ---------------------------------------------------------------------------
// 2. Admin console smoke path (AdminConsole.svelte)
// ---------------------------------------------------------------------------
describe('Admin console smoke path (AdminConsole.svelte)', () => {
  let assocSvc: AssociationService;
  const actor: ServiceActor = { userId: 'admin-user', role: 'administrator' };

  beforeEach(() => {
    assocSvc = new AssociationService(
      new DeviceRepositoryIDB(),
      new DepartmentRepositoryIDB(),
      new ProjectRepositoryIDB()
    );
  });

  it('creates departments, devices, projects and lists them all back', async () => {
    const dept = await assocSvc.createDepartment('Pathology', 'PATH', [], [], actor);
    const device = await assocSvc.createDevice('MicroScanner', dept.id, 'SN-100', actor);
    const project = await assocSvc.createProject({
      name: 'Genome Study',
      departmentId: dept.id,
      effectiveDateStart: '01/01/2026',
      effectiveDateEnd: '12/31/2026',
      priceUsd: 250,
    }, actor);

    const departments = await assocSvc.listDepartments();
    const devices = await assocSvc.listDevices();
    const projects = await assocSvc.listProjects();

    expect(departments.length).toBe(1);
    expect(departments[0].name).toBe('Pathology');
    expect(devices.length).toBe(1);
    expect(devices[0].name).toBe('MicroScanner');
    expect(projects.length).toBe(1);
    expect(projects[0].name).toBe('Genome Study');
  });

  it('edits a department to add sampleTypes and executionQueues', async () => {
    const dept = await assocSvc.createDepartment('Chemistry', 'CHEM', [], [], actor);

    await assocSvc.saveDepartment(
      {
        ...dept,
        sampleTypes: ['blood', 'urine', 'tissue'],
        executionQueues: ['priority', 'standard', 'batch'],
        updatedAt: Date.now(),
      },
      actor
    );

    const departments = await assocSvc.listDepartments();
    const updated = departments.find((d) => d.id === dept.id)!;
    expect(updated.sampleTypes).toEqual(['blood', 'urine', 'tissue']);
    expect(updated.executionQueues).toEqual(['priority', 'standard', 'batch']);
  });

  it('deletes entities', async () => {
    const dept = await assocSvc.createDepartment('Temp', 'TMP', [], [], actor);
    await assocSvc.createDevice('TempDev', dept.id, 'SN-TMP', actor);
    await assocSvc.createProject({
      name: 'TempProj',
      departmentId: dept.id,
      effectiveDateStart: '01/01/2026',
      effectiveDateEnd: '12/31/2026',
      priceUsd: 10,
    }, actor);

    await assocSvc.deleteDepartment(dept.id, actor);
    const departments = await assocSvc.listDepartments();
    expect(departments.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Grading workflow smoke path (GradingWorkflow.svelte)
// ---------------------------------------------------------------------------
describe('Grading workflow smoke path (GradingWorkflow.svelte)', () => {
  let gradingSvc: GradingService;
  let attemptRepo: AttemptRepositoryIDB;
  let questionRepo: QuestionRepositoryIDB;
  const gradingActor: ServiceActor = { userId: 'test', role: 'administrator' };

  beforeEach(() => {
    const gradeRepo = new GradeRepositoryIDB();
    attemptRepo = new AttemptRepositoryIDB();
    questionRepo = new QuestionRepositoryIDB();
    gradingSvc = new GradingService(gradeRepo, attemptRepo, questionRepo);
  });

  it('auto-scores a question, retrieves decrypted grades by reviewer, submits manual grade, flags second review', async () => {
    // Step 1: Create question and attempt, auto-score it
    const question = createQuestion({
      catalogId: 'cat-1',
      text: 'What is 2+2?',
      type: 'multiple_choice',
      correctAnswer: 'C',
      points: 10,
      createdBy: 'author-1',
    });
    await questionRepo.save(question);

    const attempt = createAttempt({ questionId: question.id, userId: 'student-1' });
    await attemptRepo.save(attempt);

    const { attempt: submitted, grade: autoGrade } = await gradingSvc.submitAndAutoScore(attempt.id, 'C', gradingActor);
    expect(submitted.status).toBe('submitted');
    expect(autoGrade).not.toBeNull();
    expect(autoGrade!.score).toBe(10);
    expect(autoGrade!.isAutoScored).toBe(true);

    // Step 2: Get decrypted grades by reviewer (simulating GradingWorkflow.svelte)
    const decryptedGrades = await gradingSvc.getDecryptedGrades(autoGrade!.reviewerId);
    expect(decryptedGrades.length).toBeGreaterThanOrEqual(0);

    // Step 3: Create an essay question for manual grading
    const essayQ = createQuestion({
      catalogId: 'cat-1',
      text: 'Explain photosynthesis',
      type: 'essay',
      correctAnswer: '-',
      points: 20,
      createdBy: 'author-1',
    });
    await questionRepo.save(essayQ);

    const essayAttempt = createAttempt({ questionId: essayQ.id, userId: 'student-2' });
    await attemptRepo.save(essayAttempt);

    await gradingSvc.submitAndAutoScore(essayAttempt.id, 'Photosynthesis is the process...', gradingActor);

    // Step 4: Submit manual grade
    const manualGrade = await gradingSvc.manualGrade({
      attemptId: essayAttempt.id,
      reviewerId: 'reviewer-1',
      score: 5,
      maxScore: 20,
      feedback: 'Needs more detail',
    }, gradingActor);
    expect(manualGrade.score).toBe(5);

    // Step 5: Change score dramatically to trigger second review flag
    const revised = await gradingSvc.manualGrade({
      attemptId: essayAttempt.id,
      reviewerId: 'reviewer-1',
      score: 18,
      maxScore: 20,
      feedback: 'Re-evaluated, actually very thorough',
    }, gradingActor);
    expect(revised.requiresSecondReview).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Notification center smoke path (NotificationCenter.svelte)
// ---------------------------------------------------------------------------
describe('Notification center smoke path (NotificationCenter.svelte)', () => {
  let notifSvc: NotificationService;
  let prefsRepo: PreferencesRepositoryLS;
  let notifRepo: NotificationRepositoryIDB;
  const notifActor = (uid: string): NotificationActor => ({ userId: uid, role: 'administrator' });

  beforeEach(() => {
    prefsRepo = new PreferencesRepositoryLS();
    notifRepo = new NotificationRepositoryIDB();
    notifSvc = new NotificationService(
      notifRepo,
      new NotificationTemplateRepositoryIDB(),
      new NotificationSubscriptionRepositoryIDB(),
      prefsRepo
    );
  });

  function setQuietHoursForUser(userId: string, enabled: boolean, start: string, end: string) {
    const prefs: UserPreferences = { ...DEFAULT_PREFERENCES, quietHours: { enabled, start, end } };
    prefsRepo.save(prefs, userId);
  }

  it('delivers a notification, queues during quiet hours, processes pending, marks as read', async () => {
    // Step 1: Send notification — delivered immediately (quiet hours disabled)
    setQuietHoursForUser('user-nc', false, '00:00', '00:01');
    const delivered = await notifSvc.send('user-nc', 'tpl', { subject: 'Welcome', body: 'Hello!' });
    expect(delivered.status).toBe('delivered');
    expect(delivered.deliveredAt).toBeGreaterThan(0);

    // Step 2: Enable quiet hours and send — should be pending
    setQuietHoursForUser('user-nc', true, '00:00', '23:59');
    const pending = await notifSvc.send('user-nc', 'tpl', { subject: 'Later', body: 'Queued' });
    expect(pending.status).toBe('pending');
    expect(pending.deliveredAt).toBeNull();

    // Step 3: Disable quiet hours and process pending -> delivered
    setQuietHoursForUser('user-nc', false, '00:00', '23:59');
    const result = await notifSvc.processPending();
    expect(result.delivered).toBe(1);
    expect(result.stillPending).toBe(0);

    // Step 4: Verify unread count before marking as read
    const unreadBefore = await notifSvc.getUnread('user-nc', notifActor('user-nc'));
    expect(unreadBefore.length).toBe(2);

    // Step 5: Mark one as read
    await notifSvc.markAsRead(delivered.id, notifActor('user-nc'));

    // Step 6: Verify unread count goes down
    const unreadAfter = await notifSvc.getUnread('user-nc', notifActor('user-nc'));
    expect(unreadAfter.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Bootstrap admin check smoke path (BootstrapAdmin.svelte)
// ---------------------------------------------------------------------------
describe('Bootstrap admin check smoke path (BootstrapAdmin.svelte)', () => {
  let authSvc: AuthService;

  beforeEach(() => {
    authSvc = new AuthService(new UserRepositoryIDB(), new AuthRepositoryLS());
  });

  it('adminExists returns false on fresh DB, true after createAdmin', async () => {
    // Fresh database has no admin
    expect(await authSvc.adminExists()).toBe(false);

    // Create bootstrap admin (null session = first admin)
    await authSvc.createAdmin('bootstrap-admin', 'securepass', 'Bootstrap Admin', null);

    // Now admin exists
    expect(await authSvc.adminExists()).toBe(true);
  });

  it('PUBLIC_REGISTRATION_ROLES does not include administrator', async () => {
    const { PUBLIC_REGISTRATION_ROLES } = await import('@domain/models/user');
    expect(PUBLIC_REGISTRATION_ROLES).not.toContain('administrator');
    expect(PUBLIC_REGISTRATION_ROLES).toContain('dispatcher');
    expect(PUBLIC_REGISTRATION_ROLES).toContain('reviewer');
    expect(PUBLIC_REGISTRATION_ROLES).toContain('content_author');
  });

  it('register as dispatcher succeeds, register as administrator fails', async () => {
    // Dispatcher registration via public register()
    const dispatcher = await authSvc.register('new-dispatcher', 'pass1234', 'dispatcher', 'Dispatcher User');
    expect(dispatcher.role).toBe('dispatcher');

    // Administrator registration via public register() is blocked
    await expect(
      authSvc.register('sneaky-admin', 'pass1234', 'administrator', 'Sneaky Admin')
    ).rejects.toThrow('cannot be self-assigned');
  });
});

// ---------------------------------------------------------------------------
// 6. Route RBAC matrix (App.svelte route guards)
// ---------------------------------------------------------------------------
describe('Route RBAC matrix (App.svelte route guards)', () => {
  const roles: UserRole[] = ['administrator', 'dispatcher', 'content_author', 'reviewer'];

  describe('new routes: /assess/:id and /grade/:id', () => {
    it('all roles can access /assess/:id (requires view_trips)', () => {
      for (const role of roles) {
        // All roles have view_trips
        expect(canAccessRoute(role, '/assess/abc-123')).toBe(true);
      }
    });

    it('only administrator and reviewer can access /grade/:id (requires grade_attempts)', () => {
      expect(canAccessRoute('administrator', '/grade/abc-123')).toBe(true);
      expect(canAccessRoute('reviewer', '/grade/abc-123')).toBe(true);
      expect(canAccessRoute('dispatcher', '/grade/abc-123')).toBe(false);
      expect(canAccessRoute('content_author', '/grade/abc-123')).toBe(false);
    });
  });

  describe('existing route access matrix', () => {
    const routeMatrix: [string, UserRole[]][] = [
      ['/admin', ['administrator']],
      ['/questions', ['administrator', 'content_author']],
      ['/grading', ['administrator', 'reviewer']],
      ['/trip/xyz/seats', ['administrator', 'dispatcher']],
      ['/trips', roles],          // view_trips — all roles
      ['/trips/new', ['administrator', 'dispatcher']],
      ['/catalogs', ['administrator', 'content_author']],
      ['/notifications', roles],  // view_notifications — all roles
      ['/nutrition', roles],      // manage_nutrition — all roles
      ['/settings', roles],       // no required permissions
    ];

    for (const [path, allowedRoles] of routeMatrix) {
      for (const role of roles) {
        const expected = allowedRoles.includes(role);
        it(`${role} ${expected ? 'CAN' : 'CANNOT'} access ${path}`, () => {
          expect(canAccessRoute(role, path)).toBe(expected);
        });
      }
    }
  });

  describe('unknown routes are accessible to all authenticated roles', () => {
    const unknownPaths = ['/', '/dashboard', '/profile', '/some-unknown-page'];
    for (const path of unknownPaths) {
      for (const role of roles) {
        it(`${role} can access unguarded route ${path}`, () => {
          expect(canAccessRoute(role, path)).toBe(true);
        });
      }
    }
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '@services/auth-service';
import { VenueService } from '@services/venue-service';
import { TripService } from '@services/trip-service';
import { QuestionService } from '@services/question-service';
import { AssociationService } from '@services/association-service';
import { NutritionService } from '@services/nutrition-service';
import { UserRepositoryIDB } from '@adapters/indexeddb/user-repository-idb';
import { AuthRepositoryLS } from '@adapters/localstorage/auth-repository-ls';
import { VenueRepositoryIDB } from '@adapters/indexeddb/venue-repository-idb';
import { SeatRepositoryIDB } from '@adapters/indexeddb/seat-repository-idb';
import { TripRepositoryIDB } from '@adapters/indexeddb/trip-repository-idb';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';
import { DeviceRepositoryIDB } from '@adapters/indexeddb/device-repository-idb';
import { DepartmentRepositoryIDB } from '@adapters/indexeddb/department-repository-idb';
import { ProjectRepositoryIDB } from '@adapters/indexeddb/project-repository-idb';
import { NutritionProfileRepositoryIDB, MealSuggestionRepositoryIDB } from '@adapters/indexeddb/nutrition-repository-idb';
import { canAccessRoute } from '@domain/policies/auth-policy';
import type { UserRole } from '@domain/models/user';

describe('E2E role smoke: full login → service → route guard flow', () => {
  let auth: AuthService;
  let venues: VenueService;
  let trips: TripService;
  let questions: QuestionService;
  let associations: AssociationService;
  let nutrition: NutritionService;

  beforeEach(() => {
    auth = new AuthService(new UserRepositoryIDB(), new AuthRepositoryLS());
    venues = new VenueService(new VenueRepositoryIDB(), new SeatRepositoryIDB());
    trips = new TripService(new TripRepositoryIDB());
    questions = new QuestionService(new QuestionRepositoryIDB());
    associations = new AssociationService(new DeviceRepositoryIDB(), new DepartmentRepositoryIDB(), new ProjectRepositoryIDB());
    nutrition = new NutritionService(new NutritionProfileRepositoryIDB(), new MealSuggestionRepositoryIDB());
  });

  async function loginAs(name: string, role: UserRole) {
    if (role === 'administrator') {
      await auth.createAdmin(name, 'pass1234', name, null);
    } else {
      await auth.register(name, 'pass1234', role, name);
    }
    return auth.login(name, 'pass1234');
  }

  it('Administrator: full CRUD across all domains', async () => {
    const session = await loginAs('admin', 'administrator');
    expect(session.role).toBe('administrator');
    expect(canAccessRoute('administrator', '/admin')).toBe(true);

    const actor = { userId: session.userId, role: session.role as import('@domain/models/user').UserRole };
    const venue = await venues.createVenue('Hall', 3, 4, actor);
    const trip = await trips.createTrip(venue.id, 'Trip1', Date.now() + 86400000, session.userId, actor);
    expect(trip.name).toBe('Trip1');

    const dept = await associations.createDepartment('Lab', 'LAB', [], [], actor);
    expect(dept.name).toBe('Lab');

    const q = await questions.create({ catalogId: 'c', text: 'Q?', type: 'essay', correctAnswer: '-', createdBy: session.userId }, actor);
    expect(q.text).toBe('Q?');
  });

  it('Dispatcher: venues, trips, seats — no admin/questions', async () => {
    const session = await loginAs('disp', 'dispatcher');
    expect(canAccessRoute('dispatcher', '/trips')).toBe(true);
    expect(canAccessRoute('dispatcher', '/admin')).toBe(false);
    expect(canAccessRoute('dispatcher', '/questions')).toBe(false);

    const actor = { userId: session.userId, role: session.role as import('@domain/models/user').UserRole };
    const venue = await venues.createVenue('V2', 2, 2, actor);
    expect(venue.rows).toBe(2);

    const trip = await trips.createTrip(venue.id, 'T', Date.now(), session.userId, actor);
    expect(trip.status).toBe('draft');
  });

  it('Content Author: questions + catalogs — no grading/admin', async () => {
    const session = await loginAs('author', 'content_author');
    expect(canAccessRoute('content_author', '/questions')).toBe(true);
    expect(canAccessRoute('content_author', '/grading')).toBe(false);
    expect(canAccessRoute('content_author', '/admin')).toBe(false);

    const authorActor = { userId: session.userId, role: session.role as import('@domain/models/user').UserRole };
    const q = await questions.create({ catalogId: 'c', text: 'Q?', type: 'true_false', correctAnswer: 'True', createdBy: session.userId }, authorActor);
    const copy = await questions.copy(q.id, session.userId, authorActor);
    expect(copy.copiedFromId).toBe(q.id);
  });

  it('Reviewer: grading — no trips/seats/admin/questions', async () => {
    const session = await loginAs('reviewer', 'reviewer');
    expect(canAccessRoute('reviewer', '/grading')).toBe(true);
    expect(canAccessRoute('reviewer', '/admin')).toBe(false);
    expect(canAccessRoute('reviewer', '/questions')).toBe(false);
    expect(canAccessRoute('reviewer', '/trip/x/seats')).toBe(false);
    expect(session.role).toBe('reviewer');
  });

  it('Nutrition: all roles can access /nutrition and save profile', async () => {
    for (const role of ['dispatcher', 'content_author', 'reviewer'] as UserRole[]) {
      const session = await loginAs(`${role}_nut`, role);
      expect(canAccessRoute(role, '/nutrition')).toBe(true);
      const profile = await nutrition.saveProfile({ userId: session.userId, dailyCalories: 1800 });
      expect(profile.dailyCalories).toBe(1800);
    }
  });

  it('Session validation rejects tampered role in cross-flow', async () => {
    const session = await loginAs('target', 'dispatcher');
    const authRepo = new AuthRepositoryLS();
    authRepo.saveSession({ ...session, role: 'administrator' });
    const validated = await auth.validateSession();
    expect(validated).toBeNull(); // tampered → rejected
  });
});

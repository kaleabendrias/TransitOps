import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '@services/auth-service';
import { VenueService } from '@services/venue-service';
import { TripService } from '@services/trip-service';
import { QuestionService } from '@services/question-service';
import { NutritionService } from '@services/nutrition-service';
import { PreferencesService } from '@services/preferences-service';
import { GradingService } from '@services/grading-service';
import { UserRepositoryIDB } from '@adapters/indexeddb/user-repository-idb';
import { AuthRepositoryLS } from '@adapters/localstorage/auth-repository-ls';
import { VenueRepositoryIDB } from '@adapters/indexeddb/venue-repository-idb';
import { SeatRepositoryIDB } from '@adapters/indexeddb/seat-repository-idb';
import { TripRepositoryIDB } from '@adapters/indexeddb/trip-repository-idb';
import { QuestionRepositoryIDB } from '@adapters/indexeddb/question-repository-idb';
import { AttemptRepositoryIDB } from '@adapters/indexeddb/attempt-repository-idb';
import { GradeRepositoryIDB } from '@adapters/indexeddb/grade-repository-idb';
import { NutritionProfileRepositoryIDB, MealSuggestionRepositoryIDB } from '@adapters/indexeddb/nutrition-repository-idb';
import { PreferencesRepositoryLS } from '@adapters/localstorage/preferences-repository-ls';
import { canAccessRoute } from '@domain/policies/auth-policy';
import type { UserRole } from '@domain/models/user';
import { createAttempt } from '@domain/models/attempt';

describe('Critical page interactions by role', () => {
  let auth: AuthService;
  let venues: VenueService;
  let trips: TripService;
  let questions: QuestionService;
  let nutrition: NutritionService;
  let prefs: PreferencesService;
  let grading: GradingService;

  beforeEach(() => {
    auth = new AuthService(new UserRepositoryIDB(), new AuthRepositoryLS());
    venues = new VenueService(new VenueRepositoryIDB(), new SeatRepositoryIDB());
    trips = new TripService(new TripRepositoryIDB());
    questions = new QuestionService(new QuestionRepositoryIDB());
    nutrition = new NutritionService(new NutritionProfileRepositoryIDB(), new MealSuggestionRepositoryIDB());
    prefs = new PreferencesService(new PreferencesRepositoryLS());
    const questionRepo = new QuestionRepositoryIDB();
    const attemptRepo = new AttemptRepositoryIDB();
    grading = new GradingService(new GradeRepositoryIDB(), attemptRepo, questionRepo);
  });

  async function loginAs(name: string, role: UserRole) {
    if (role === 'administrator') await auth.createAdmin(name, 'pass1234', name, null);
    else await auth.register(name, 'pass1234', role, name);
    const session = await auth.login(name, 'pass1234');
    prefs.setCurrentUser(session.userId);
    return session;
  }

  describe('Dispatcher page flow', () => {
    it('creates venue → trip → verifies route access', async () => {
      const s = await loginAs('disp', 'dispatcher');
      expect(canAccessRoute('dispatcher', '/trips')).toBe(true);
      expect(canAccessRoute('dispatcher', '/admin')).toBe(false);

      const actor = { userId: s.userId, role: 'dispatcher' as const };
      const venue = await venues.createVenue('Hall', 3, 4, actor);
      const trip = await trips.createTrip(venue.id, 'Trip1', Date.now() + 86400000, s.userId, actor);
      expect(trip.status).toBe('draft');
      expect((await trips.listTrips()).length).toBe(1);
    });
  });

  describe('Content Author page flow', () => {
    it('creates → edits → copies → deactivates → deletes → restores question', async () => {
      const s = await loginAs('author', 'content_author');
      expect(canAccessRoute('content_author', '/questions')).toBe(true);

      const ca = { userId: s.userId, role: 'content_author' as const };
      const q = await questions.create({ catalogId: 'c', text: 'What?', type: 'essay', correctAnswer: '-', createdBy: s.userId }, ca);
      const edited = await questions.edit(q.id, { text: 'Updated?' }, ca);
      expect(edited.text).toBe('Updated?');

      const copy = await questions.copy(q.id, s.userId, ca);
      expect(copy.copiedFromId).toBe(q.id);

      await questions.deactivate(q.id, ca);
      expect((await questions.get(q.id))!.status).toBe('inactive');

      await questions.softDelete(q.id, ca);
      expect((await questions.get(q.id))!.status).toBe('deleted');

      await questions.restore(q.id, ca);
      expect((await questions.get(q.id))!.status).toBe('active');
    });
  });

  describe('Reviewer page flow', () => {
    it('auto-scores MC then views in grading workflow', async () => {
      await loginAs('rev', 'reviewer');
      expect(canAccessRoute('reviewer', '/grading')).toBe(true);
      expect(canAccessRoute('reviewer', '/admin')).toBe(false);

      const questionRepo = new QuestionRepositoryIDB();
      const attemptRepo = new AttemptRepositoryIDB();
      const { createQuestion } = await import('@domain/models/question');
      const q = createQuestion({ catalogId: 'c', text: 'Q', type: 'multiple_choice', correctAnswer: 'B', points: 5, createdBy: 'author' });
      await questionRepo.save(q);
      const a = createAttempt({ questionId: q.id, userId: 'student' });
      await attemptRepo.save(a);

      const { grade } = await grading.submitAndAutoScore(a.id, 'B');
      expect(grade).not.toBeNull();
      expect(grade!.score).toBe(5);
    });
  });

  describe('Nutrition page flow', () => {
    it('saves profile with allergens → generates filtered suggestions', async () => {
      const s = await loginAs('nutUser', 'dispatcher');
      const profile = await nutrition.saveProfile({ userId: s.userId, dailyCalories: 2500, allergens: ['omega-3'] });
      expect(profile.allergens).toEqual(['omega-3']);

      const suggestions = await nutrition.generateSuggestions(s.userId);
      const names = suggestions.map(m => m.name);
      expect(names).not.toContain('Salmon with quinoa');
    });
  });

  describe('Settings page flow', () => {
    it('preferences persist per user across simulated sessions', async () => {
      const s1 = await loginAs('settingsA', 'dispatcher');
      prefs.updatePreferences({ theme: 'dark', gradingConfig: { roundingIncrement: 0.25, typeWeights: { essay: 3.0 } as any } });

      prefs.setCurrentUser(undefined);
      const s2 = await loginAs('settingsB', 'reviewer');
      expect(prefs.getPreferences().theme).toBe('light');

      prefs.setCurrentUser(s1.userId);
      expect(prefs.getPreferences().theme).toBe('dark');
      expect(prefs.getPreferences().gradingConfig.roundingIncrement).toBe(0.25);
    });
  });

  describe('Admin page flow', () => {
    it('admin can list users; non-admin cannot', async () => {
      await loginAs('adminUser', 'administrator');
      const adminSession = auth.getSession()!;
      const users = await auth.listUsers(adminSession);
      expect(users.length).toBeGreaterThan(0);
      expect(users.every(u => !('passwordHash' in u))).toBe(true);

      await loginAs('dispUser', 'dispatcher');
      const dispSession = auth.getSession()!;
      await expect(auth.listUsers(dispSession)).rejects.toThrow('Only administrators');
    });
  });
});

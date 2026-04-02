import {
  SeatRepositoryIDB, VenueRepositoryIDB, UserRepositoryIDB,
  TripRepositoryIDB, SeatMapRepositoryIDB, HoldRepositoryIDB,
  QuestionRepositoryIDB, AttemptRepositoryIDB, GradeRepositoryIDB,
  NotificationRepositoryIDB,
  NotificationTemplateRepositoryIDB, NotificationSubscriptionRepositoryIDB,
  NutritionProfileRepositoryIDB, MealSuggestionRepositoryIDB,
  DeviceRepositoryIDB, DepartmentRepositoryIDB, ProjectRepositoryIDB,
} from '@adapters/indexeddb';
import { PreferencesRepositoryLS, AuthRepositoryLS } from '@adapters/localstorage';

import { VenueService } from './venue-service';
import { SeatService } from './seat-service';
import { PreferencesService } from './preferences-service';
import { AuthService } from './auth-service';
import { TripService } from './trip-service';
import { SeatMapService } from './seat-map-service';
import { HoldService } from './hold-service';
import { QuestionService } from './question-service';
import { GradingService } from './grading-service';
import { NotificationService } from './notification-service';
import { NutritionService } from './nutrition-service';
import { CryptoStorageService } from './crypto-storage-service';
import { ExportImportService } from './export-import-service';
import { AssociationService } from './association-service';

const seatRepo = new SeatRepositoryIDB();
const venueRepo = new VenueRepositoryIDB();
const userRepo = new UserRepositoryIDB();
const tripRepo = new TripRepositoryIDB();
const seatMapRepo = new SeatMapRepositoryIDB();
const holdRepo = new HoldRepositoryIDB();
const questionRepo = new QuestionRepositoryIDB();
const attemptRepo = new AttemptRepositoryIDB();
const gradeRepo = new GradeRepositoryIDB();
const prefsRepo = new PreferencesRepositoryLS();
const authRepo = new AuthRepositoryLS();
const notifRepo = new NotificationRepositoryIDB();
const notifTemplateRepo = new NotificationTemplateRepositoryIDB();
const notifSubRepo = new NotificationSubscriptionRepositoryIDB();
const nutritionProfileRepo = new NutritionProfileRepositoryIDB();
const mealSuggestionRepo = new MealSuggestionRepositoryIDB();
const deviceRepo = new DeviceRepositoryIDB();
const deptRepo = new DepartmentRepositoryIDB();
const projRepo = new ProjectRepositoryIDB();

export const venueService = new VenueService(venueRepo, seatRepo);
export const seatService = new SeatService(seatRepo);
export const preferencesService = new PreferencesService(prefsRepo);
export const authService = new AuthService(userRepo, authRepo);
export const tripService = new TripService(tripRepo);
export const seatMapService = new SeatMapService(seatMapRepo, holdRepo);
export const holdService = new HoldService(holdRepo, seatMapRepo);
export const questionService = new QuestionService(questionRepo);
export const cryptoStorageService = new CryptoStorageService();
export const gradingService = new GradingService(gradeRepo, attemptRepo, questionRepo, cryptoStorageService, prefsRepo);
export const notificationService = new NotificationService(notifRepo, notifTemplateRepo, notifSubRepo, prefsRepo);
export const nutritionService = new NutritionService(nutritionProfileRepo, mealSuggestionRepo, cryptoStorageService);
export const exportImportService = new ExportImportService();
export const associationService = new AssociationService(deviceRepo, deptRepo, projRepo);

import type { NutritionProfile, MealSuggestion } from '../models/nutrition';

export interface NutritionProfileRepository {
  getByUser(userId: string): Promise<NutritionProfile | null>;
  save(profile: NutritionProfile): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface MealSuggestionRepository {
  getByProfile(profileId: string): Promise<MealSuggestion[]>;
  save(suggestion: MealSuggestion): Promise<void>;
  saveBatch(suggestions: MealSuggestion[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByProfile(profileId: string): Promise<void>;
}

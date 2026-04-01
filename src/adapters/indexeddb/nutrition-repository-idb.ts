import type { NutritionProfile, MealSuggestion } from '@domain/models/nutrition';
import type { NutritionProfileRepository, MealSuggestionRepository } from '@domain/ports/nutrition-repository';
import { getDb } from './db';

export class NutritionProfileRepositoryIDB implements NutritionProfileRepository {
  async getByUser(userId: string): Promise<NutritionProfile | null> {
    const db = await getDb();
    const all = await db.getAllFromIndex('nutritionProfiles', 'by-user', userId) as NutritionProfile[];
    return all[0] ?? null;
  }
  async save(p: NutritionProfile): Promise<void> { const db = await getDb(); await db.put('nutritionProfiles', { ...p }); }
  async delete(id: string): Promise<void> { const db = await getDb(); await db.delete('nutritionProfiles', id); }
}

export class MealSuggestionRepositoryIDB implements MealSuggestionRepository {
  async getByProfile(profileId: string): Promise<MealSuggestion[]> { const db = await getDb(); return db.getAllFromIndex('mealSuggestions', 'by-profile', profileId) as Promise<MealSuggestion[]>; }
  async save(s: MealSuggestion): Promise<void> { const db = await getDb(); await db.put('mealSuggestions', { ...s }); }
  async saveBatch(suggestions: MealSuggestion[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('mealSuggestions', 'readwrite');
    await Promise.all([...suggestions.map((s) => tx.store.put({ ...s })), tx.done]);
  }
  async delete(id: string): Promise<void> { const db = await getDb(); await db.delete('mealSuggestions', id); }
  async deleteByProfile(profileId: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('mealSuggestions', 'readwrite');
    const index = tx.store.index('by-profile');
    let cursor = await index.openCursor(profileId);
    while (cursor) { await cursor.delete(); cursor = await cursor.continue(); }
    await tx.done;
  }
}

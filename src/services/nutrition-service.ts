import type { NutritionProfile, MealSuggestion, PortionSwap } from '@domain/models/nutrition';
import { createNutritionProfile, createMealSuggestion, computeRemainingBudget } from '@domain/models/nutrition';
import type { NutritionProfileRepository, MealSuggestionRepository } from '@domain/ports/nutrition-repository';
import type { CryptoStorageService } from './crypto-storage-service';

const MEAL_DB: Array<{
  name: string; mealType: MealSuggestion['mealType']; calories: number;
  proteinG: number; carbsG: number; fatG: number; fiberG: number;
  tags: string[]; swaps: PortionSwap[];
}> = [
  { name: 'Oatmeal with berries', mealType: 'breakfast', calories: 300, proteinG: 8, carbsG: 50, fatG: 6, fiberG: 5, tags: ['whole-grain', 'fruit'], swaps: [{ name: 'Granola with yogurt', calories: 310, proteinG: 10, carbsG: 45, fatG: 8, reason: 'Higher protein, similar calories' }] },
  { name: 'Grilled chicken salad', mealType: 'lunch', calories: 400, proteinG: 35, carbsG: 20, fatG: 18, fiberG: 4, tags: ['high-protein', 'low-carb'], swaps: [{ name: 'Turkey wrap', calories: 420, proteinG: 30, carbsG: 35, fatG: 14, reason: 'More portable, similar macros' }] },
  { name: 'Salmon with quinoa', mealType: 'dinner', calories: 500, proteinG: 40, carbsG: 45, fatG: 16, fiberG: 3, tags: ['omega-3', 'complete-protein'], swaps: [{ name: 'Tuna steak with brown rice', calories: 480, proteinG: 42, carbsG: 40, fatG: 12, reason: 'Leaner, similar omega-3 content' }] },
  { name: 'Greek yogurt parfait', mealType: 'snack', calories: 200, proteinG: 15, carbsG: 25, fatG: 5, fiberG: 2, tags: ['probiotics', 'calcium'], swaps: [{ name: 'Cottage cheese with fruit', calories: 190, proteinG: 18, carbsG: 20, fatG: 4, reason: 'Higher protein, similar taste profile' }] },
  { name: 'Egg white omelet', mealType: 'breakfast', calories: 250, proteinG: 22, carbsG: 5, fatG: 8, fiberG: 1, tags: ['high-protein', 'low-carb'], swaps: [{ name: 'Scrambled tofu', calories: 220, proteinG: 18, carbsG: 8, fatG: 10, reason: 'Plant-based alternative with similar protein' }] },
  { name: 'Lentil soup', mealType: 'lunch', calories: 350, proteinG: 18, carbsG: 45, fatG: 8, fiberG: 12, tags: ['fiber', 'plant-protein'], swaps: [{ name: 'Black bean bowl', calories: 370, proteinG: 15, carbsG: 50, fatG: 7, reason: 'Higher fiber, similar flavor profile' }] },
  { name: 'Stir-fry vegetables with tofu', mealType: 'dinner', calories: 380, proteinG: 20, carbsG: 35, fatG: 14, fiberG: 6, tags: ['plant-based', 'vegetables'], swaps: [{ name: 'Vegetable curry with chickpeas', calories: 400, proteinG: 16, carbsG: 42, fatG: 16, reason: 'More aromatic, similar nutritional profile' }] },
  { name: 'Mixed nuts', mealType: 'snack', calories: 180, proteinG: 5, carbsG: 8, fatG: 16, fiberG: 2, tags: ['healthy-fats', 'portable'], swaps: [{ name: 'Trail mix', calories: 200, proteinG: 6, carbsG: 20, fatG: 12, reason: 'Added dried fruit for energy, more balanced macros' }] },
];

const REDACTED_MARKER = ['[encrypted]'];

export class NutritionService {
  constructor(
    private readonly profileRepo: NutritionProfileRepository,
    private readonly mealRepo: MealSuggestionRepository,
    private readonly cryptoStore?: CryptoStorageService
  ) {}

  async getProfile(userId: string): Promise<NutritionProfile | null> {
    const profile = await this.profileRepo.getByUser(userId);
    if (!profile) return null;
    if (!this.cryptoStore) return profile;

    const encrypted = await this.cryptoStore.decrypt(`nutrition:${profile.id}`);
    if (encrypted) {
      const sensitive = JSON.parse(encrypted);
      return { ...profile, allergens: sensitive.allergens ?? [], restrictions: sensitive.restrictions ?? [] };
    }

    // Legacy migration: plaintext not yet encrypted
    if (profile.allergens.length > 0 && profile.allergens[0] !== '[encrypted]') {
      await this.encryptAndScrub(profile);
      return profile;
    }

    return { ...profile, allergens: [], restrictions: [] };
  }

  async saveProfile(params: {
    userId: string; ageRange?: NutritionProfile['ageRange']; activityLevel?: NutritionProfile['activityLevel'];
    allergens?: string[]; dailyCalories?: number; dailyProteinG?: number;
    dailyCarbsG?: number; dailyFatG?: number; dailyFiberG?: number;
    restrictions?: string[]; goals?: string[];
  }): Promise<NutritionProfile> {
    const existing = await this.profileRepo.getByUser(params.userId);
    const profile = existing
      ? { ...existing, ...params, updatedAt: Date.now() }
      : createNutritionProfile(params);

    const sensitiveAllergens = profile.allergens;
    const sensitiveRestrictions = profile.restrictions;

    if (this.cryptoStore) {
      const scrubbed = { ...profile, allergens: REDACTED_MARKER, restrictions: REDACTED_MARKER };
      await this.profileRepo.save(scrubbed);
      await this.cryptoStore.encrypt(`nutrition:${profile.id}`, JSON.stringify({
        allergens: sensitiveAllergens,
        restrictions: sensitiveRestrictions,
      }));
    } else {
      await this.profileRepo.save(profile);
    }

    return { ...profile, allergens: sensitiveAllergens, restrictions: sensitiveRestrictions };
  }

  async applySuggestionSwap(userId: string, suggestionId: string, swapIndex: number): Promise<MealSuggestion[]> {
    const profile = await this.profileRepo.getByUser(userId);
    if (!profile) throw new Error('No nutrition profile found');

    const suggestions = await this.mealRepo.getByProfile(profile.id);
    const target = suggestions.find((s) => s.id === suggestionId);
    if (!target) throw new Error('Suggestion not found');
    if (swapIndex < 0 || swapIndex >= target.equivalentSwaps.length) throw new Error('Invalid swap index');

    const swap = target.equivalentSwaps[swapIndex];
    const replaced = createMealSuggestion({
      profileId: profile.id, mealType: target.mealType, name: swap.name,
      calories: swap.calories, proteinG: swap.proteinG, carbsG: swap.carbsG, fatG: swap.fatG,
      reason: swap.reason, tags: target.tags,
      equivalentSwaps: [{ name: target.name, calories: target.calories, proteinG: target.proteinG, carbsG: target.carbsG, fatG: target.fatG, reason: 'Original selection' }],
    });

    await this.mealRepo.delete(target.id);
    await this.mealRepo.save(replaced);
    return this.mealRepo.getByProfile(profile.id);
  }

  async generateSuggestions(userId: string): Promise<MealSuggestion[]> {
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error('No nutrition profile found');

    await this.mealRepo.deleteByProfile(profile.id);

    const budget = { calories: profile.dailyCalories, proteinG: profile.dailyProteinG, carbsG: profile.dailyCarbsG, fatG: profile.dailyFatG, fiberG: profile.dailyFiberG };
    const mealTypes: MealSuggestion['mealType'][] = ['breakfast', 'lunch', 'dinner', 'snack'];
    const suggestions: MealSuggestion[] = [];

    for (const mealType of mealTypes) {
      const candidates = MEAL_DB.filter((m) => m.mealType === mealType);
      const filtered = candidates.filter((m) => {
        if (profile.restrictions.includes('vegetarian') && m.tags.includes('meat')) return false;
        if (profile.allergens.length > 0) {
          const allergenSet = new Set(profile.allergens.map(a => a.toLowerCase()));
          if (m.tags.some(t => allergenSet.has(t.toLowerCase()))) return false;
        }
        return m.calories <= budget.calories;
      });
      // Prefer filtered candidates; fall back to budget-only filter (no allergen match)
      // but never serve an allergen-conflicting meal
      const allergenSafe = profile.allergens.length > 0
        ? candidates.filter((m) => {
            const allergenSet = new Set(profile.allergens.map(a => a.toLowerCase()));
            return !m.tags.some(t => allergenSet.has(t.toLowerCase()));
          })
        : candidates;
      const pick = filtered[0] ?? allergenSafe[0];
      if (!pick) continue;

      const reason = this.explainReason(pick, profile, budget);
      const suggestion = createMealSuggestion({
        profileId: profile.id, mealType, name: pick.name,
        calories: pick.calories, proteinG: pick.proteinG,
        carbsG: pick.carbsG, fatG: pick.fatG, fiberG: pick.fiberG,
        reason, tags: pick.tags, equivalentSwaps: pick.swaps,
      });
      suggestions.push(suggestion);
      budget.calories -= pick.calories;
      budget.proteinG -= pick.proteinG;
      budget.carbsG -= pick.carbsG;
      budget.fatG -= pick.fatG;
    }

    await this.mealRepo.saveBatch(suggestions);
    return suggestions;
  }

  async getSuggestions(userId: string): Promise<MealSuggestion[]> {
    const profile = await this.profileRepo.getByUser(userId);
    if (!profile) return [];
    return this.mealRepo.getByProfile(profile.id);
  }

  async getRemainingBudget(userId: string, consumed: { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number }): Promise<ReturnType<typeof computeRemainingBudget>> {
    const profile = await this.profileRepo.getByUser(userId);
    if (!profile) throw new Error('No nutrition profile found');
    return computeRemainingBudget(profile, consumed);
  }

  private async encryptAndScrub(profile: NutritionProfile): Promise<void> {
    if (!this.cryptoStore) return;
    await this.cryptoStore.encrypt(`nutrition:${profile.id}`, JSON.stringify({
      allergens: profile.allergens, restrictions: profile.restrictions,
    }));
    await this.profileRepo.save({ ...profile, allergens: REDACTED_MARKER, restrictions: REDACTED_MARKER, updatedAt: Date.now() });
  }

  private explainReason(meal: typeof MEAL_DB[0], profile: NutritionProfile, budget: { calories: number; proteinG: number }): string {
    const reasons: string[] = [];
    if (meal.calories <= budget.calories * 0.35) reasons.push('Fits within your calorie budget');
    if (meal.proteinG >= 15) reasons.push('Good protein source');
    if (meal.fiberG >= 4) reasons.push('High in fiber');
    if (profile.goals.includes('muscle-gain') && meal.proteinG >= 20) reasons.push('Supports muscle-building goals');
    if (profile.goals.includes('weight-loss') && meal.calories <= 350) reasons.push('Low-calorie option for weight management');
    return reasons.length > 0 ? reasons.join('; ') : 'Balanced nutritional profile for your daily needs';
  }
}

import { describe, it, expect, beforeEach } from 'vitest';
import { NutritionService } from '@services/nutrition-service';
import { NutritionProfileRepositoryIDB, MealSuggestionRepositoryIDB } from '@adapters/indexeddb/nutrition-repository-idb';

describe('Allergen-aware meal filtering', () => {
  let svc: NutritionService;

  beforeEach(() => {
    svc = new NutritionService(new NutritionProfileRepositoryIDB(), new MealSuggestionRepositoryIDB());
  });

  it('excludes meals tagged with user allergens', async () => {
    // 'calcium' tag appears on Greek yogurt parfait (dairy allergen proxy)
    await svc.saveProfile({ userId: 'u1', dailyCalories: 3000, allergens: ['calcium'] });
    const suggestions = await svc.generateSuggestions('u1');
    const names = suggestions.map(s => s.name);
    expect(names).not.toContain('Greek yogurt parfait');
  });

  it('case-insensitive allergen matching', async () => {
    await svc.saveProfile({ userId: 'u2', dailyCalories: 3000, allergens: ['Omega-3'] });
    const suggestions = await svc.generateSuggestions('u2');
    const names = suggestions.map(s => s.name);
    expect(names).not.toContain('Salmon with quinoa');
  });

  it('no allergens means no filtering', async () => {
    await svc.saveProfile({ userId: 'u3', dailyCalories: 3000, allergens: [] });
    const suggestions = await svc.generateSuggestions('u3');
    expect(suggestions.length).toBe(4); // one per meal type
  });

  it('multiple allergens all excluded', async () => {
    await svc.saveProfile({ userId: 'u4', dailyCalories: 3000, allergens: ['whole-grain', 'high-protein'] });
    const suggestions = await svc.generateSuggestions('u4');
    const names = suggestions.map(s => s.name);
    // 'Oatmeal with berries' has 'whole-grain', 'Egg white omelet' has 'high-protein'
    expect(names).not.toContain('Oatmeal with berries');
    expect(names).not.toContain('Egg white omelet');
  });

  it('allergen filtering still returns fallback candidates per meal type', async () => {
    // Even with aggressive allergens, each meal type has a fallback
    await svc.saveProfile({ userId: 'u5', dailyCalories: 3000, allergens: ['whole-grain'] });
    const suggestions = await svc.generateSuggestions('u5');
    const types = suggestions.map(s => s.mealType);
    expect(types).toContain('breakfast'); // should pick Egg white omelet instead
  });
});

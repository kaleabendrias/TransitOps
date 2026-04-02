import { describe, it, expect, beforeEach } from 'vitest';
import { NutritionService } from '@services/nutrition-service';
import { NutritionProfileRepositoryIDB, MealSuggestionRepositoryIDB } from '@adapters/indexeddb/nutrition-repository-idb';

describe('NutritionService', () => {
  let svc: NutritionService;

  beforeEach(() => {
    svc = new NutritionService(new NutritionProfileRepositoryIDB(), new MealSuggestionRepositoryIDB());
  });

  it('saves and retrieves profile', async () => {
    const p = await svc.saveProfile({ userId: 'u1', dailyCalories: 1800 });
    expect(p.dailyCalories).toBe(1800);

    const fetched = await svc.getProfile('u1');
    expect(fetched).not.toBeNull();
    expect(fetched!.dailyCalories).toBe(1800);
  });

  it('updates existing profile', async () => {
    await svc.saveProfile({ userId: 'u1', dailyCalories: 2000 });
    const updated = await svc.saveProfile({ userId: 'u1', dailyCalories: 1500 });
    expect(updated.dailyCalories).toBe(1500);
  });

  it('generates meal suggestions', async () => {
    await svc.saveProfile({ userId: 'u2', dailyCalories: 2500 });
    const suggestions = await svc.generateSuggestions('u2');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(4);
    for (const s of suggestions) {
      expect(s.reason).toBeTruthy();
      expect(s.calories).toBeGreaterThan(0);
    }
  });

  it('getSuggestions retrieves saved suggestions', async () => {
    await svc.saveProfile({ userId: 'u3' });
    await svc.generateSuggestions('u3');
    const saved = await svc.getSuggestions('u3');
    expect(saved.length).toBeGreaterThan(0);
  });

  it('generateSuggestions replaces old ones', async () => {
    await svc.saveProfile({ userId: 'u4' });
    await svc.generateSuggestions('u4');
    const first = await svc.getSuggestions('u4');
    await svc.generateSuggestions('u4');
    const second = await svc.getSuggestions('u4');
    expect(second.length).toBe(first.length);
  });

  it('generateSuggestions rejects without profile', async () => {
    await expect(svc.generateSuggestions('nobody')).rejects.toThrow('No nutrition profile');
  });

  it('getRemainingBudget computes correctly', async () => {
    await svc.saveProfile({ userId: 'u5', dailyCalories: 2000, dailyProteinG: 50 });
    const r = await svc.getRemainingBudget('u5', { calories: 800, proteinG: 20, carbsG: 0, fatG: 0, fiberG: 0 });
    expect(r.calories).toBe(1200);
    expect(r.proteinG).toBe(30);
  });

  it('getRemainingBudget rejects without profile', async () => {
    await expect(svc.getRemainingBudget('nobody', { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 })).rejects.toThrow();
  });

  it('getSuggestions returns empty without profile', async () => {
    const result = await svc.getSuggestions('nobody');
    expect(result).toEqual([]);
  });
});

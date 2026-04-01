import { describe, it, expect, beforeEach } from 'vitest';
import { NutritionService } from '@services/nutrition-service';
import { NutritionProfileRepositoryIDB, MealSuggestionRepositoryIDB } from '@adapters/indexeddb/nutrition-repository-idb';

describe('One-click swap apply', () => {
  let svc: NutritionService;

  beforeEach(() => {
    svc = new NutritionService(new NutritionProfileRepositoryIDB(), new MealSuggestionRepositoryIDB());
  });

  it('replaces a suggestion with the swapped alternative', async () => {
    await svc.saveProfile({ userId: 'u1', dailyCalories: 2500 });
    const original = await svc.generateSuggestions('u1');
    expect(original.length).toBeGreaterThan(0);

    const target = original.find((s) => s.equivalentSwaps.length > 0);
    expect(target).toBeDefined();

    const swapName = target!.equivalentSwaps[0].name;
    const updated = await svc.applySuggestionSwap('u1', target!.id, 0);

    // The swapped meal should now be in the list
    const swapped = updated.find((s) => s.name === swapName);
    expect(swapped).toBeDefined();
    // The original should no longer be present
    const absent = updated.find((s) => s.id === target!.id);
    expect(absent).toBeUndefined();
  });

  it('the replaced suggestion has the original as a reverse swap', async () => {
    await svc.saveProfile({ userId: 'u2', dailyCalories: 2500 });
    const original = await svc.generateSuggestions('u2');
    const target = original.find((s) => s.equivalentSwaps.length > 0)!;

    const updated = await svc.applySuggestionSwap('u2', target.id, 0);
    const swapped = updated.find((s) => s.name === target.equivalentSwaps[0].name)!;

    expect(swapped.equivalentSwaps.length).toBe(1);
    expect(swapped.equivalentSwaps[0].name).toBe(target.name);
  });

  it('totals change after swap', async () => {
    await svc.saveProfile({ userId: 'u3', dailyCalories: 2500 });
    const original = await svc.generateSuggestions('u3');
    const target = original.find((s) => s.equivalentSwaps.length > 0)!;

    const originalTotal = original.reduce((sum, m) => sum + m.calories, 0);
    const updated = await svc.applySuggestionSwap('u3', target.id, 0);
    const newTotal = updated.reduce((sum, m) => sum + m.calories, 0);

    // Total should differ by the calorie difference of the swap
    const calDiff = target.equivalentSwaps[0].calories - target.calories;
    expect(newTotal).toBe(originalTotal + calDiff);
  });

  it('rejects swap with invalid suggestion id', async () => {
    await svc.saveProfile({ userId: 'u4' });
    await expect(svc.applySuggestionSwap('u4', 'nonexistent', 0)).rejects.toThrow('not found');
  });

  it('rejects swap with invalid index', async () => {
    await svc.saveProfile({ userId: 'u5', dailyCalories: 2500 });
    const original = await svc.generateSuggestions('u5');
    const target = original[0];
    await expect(svc.applySuggestionSwap('u5', target.id, 99)).rejects.toThrow('Invalid swap index');
  });

  it('rejects swap without profile', async () => {
    await expect(svc.applySuggestionSwap('nobody', 'x', 0)).rejects.toThrow('No nutrition profile');
  });
});

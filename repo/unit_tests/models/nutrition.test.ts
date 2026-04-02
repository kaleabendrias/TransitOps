import { describe, it, expect } from 'vitest';
import { createNutritionProfile, createMealSuggestion, computeRemainingBudget } from '@domain/models/nutrition';

describe('Nutrition Model', () => {
  it('creates profile with defaults', () => {
    const p = createNutritionProfile({ userId: 'u1' });
    expect(p.dailyCalories).toBe(2000);
    expect(p.dailyProteinG).toBe(50);
    expect(p.dailyCarbsG).toBe(250);
    expect(p.dailyFatG).toBe(65);
    expect(p.dailyFiberG).toBe(25);
    expect(p.restrictions).toEqual([]);
    expect(p.goals).toEqual([]);
  });

  it('creates profile with custom values', () => {
    const p = createNutritionProfile({ userId: 'u', dailyCalories: 1800, restrictions: ['vegan'], goals: ['cut'] });
    expect(p.dailyCalories).toBe(1800);
    expect(p.restrictions).toEqual(['vegan']);
  });

  it('creates meal suggestion with defaults', () => {
    const m = createMealSuggestion({ profileId: 'p', mealType: 'lunch', name: 'Salad', calories: 300, proteinG: 20, carbsG: 30, fatG: 10, reason: 'Low cal' });
    expect(m.fiberG).toBe(0);
    expect(m.tags).toEqual([]);
    expect(m.equivalentSwaps).toEqual([]);
  });

  it('creates meal suggestion with swaps', () => {
    const m = createMealSuggestion({
      profileId: 'p', mealType: 'dinner', name: 'Salmon', calories: 500, proteinG: 40, carbsG: 45, fatG: 16, fiberG: 3,
      reason: 'Omega-3', tags: ['fish'], equivalentSwaps: [{ name: 'Tuna', calories: 480, proteinG: 42, carbsG: 40, fatG: 12, reason: 'Leaner' }],
    });
    expect(m.equivalentSwaps).toHaveLength(1);
    expect(m.fiberG).toBe(3);
  });

  it('computeRemainingBudget subtracts consumed', () => {
    const p = createNutritionProfile({ userId: 'u', dailyCalories: 2000, dailyProteinG: 50, dailyCarbsG: 250, dailyFatG: 65, dailyFiberG: 25 });
    const r = computeRemainingBudget(p, { calories: 800, proteinG: 30, carbsG: 100, fatG: 20, fiberG: 10 });
    expect(r.calories).toBe(1200);
    expect(r.proteinG).toBe(20);
    expect(r.carbsG).toBe(150);
    expect(r.fatG).toBe(45);
    expect(r.fiberG).toBe(15);
  });

  it('computeRemainingBudget floors at 0', () => {
    const p = createNutritionProfile({ userId: 'u' });
    const r = computeRemainingBudget(p, { calories: 9999, proteinG: 9999, carbsG: 9999, fatG: 9999, fiberG: 9999 });
    expect(r.calories).toBe(0);
    expect(r.proteinG).toBe(0);
  });
});

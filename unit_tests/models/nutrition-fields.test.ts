import { describe, it, expect } from 'vitest';
import { createNutritionProfile } from '@domain/models/nutrition';

describe('Nutrition Profile new fields', () => {
  it('defaults ageRange, activityLevel, allergens', () => {
    const p = createNutritionProfile({ userId: 'u1' });
    expect(p.ageRange).toBe('26-35');
    expect(p.activityLevel).toBe('moderate');
    expect(p.allergens).toEqual([]);
  });

  it('accepts custom ageRange, activityLevel, allergens', () => {
    const p = createNutritionProfile({
      userId: 'u1', ageRange: '46-55', activityLevel: 'very_active',
      allergens: ['dairy', 'nuts', 'gluten'],
    });
    expect(p.ageRange).toBe('46-55');
    expect(p.activityLevel).toBe('very_active');
    expect(p.allergens).toEqual(['dairy', 'nuts', 'gluten']);
  });
});

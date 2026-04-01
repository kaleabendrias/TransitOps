export type AgeRange = '18-25' | '26-35' | '36-45' | '46-55' | '56-65' | '65+';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface NutritionProfile {
  readonly id: string;
  readonly userId: string;
  readonly ageRange: AgeRange;
  readonly activityLevel: ActivityLevel;
  readonly allergens: string[];
  readonly dailyCalories: number;
  readonly dailyProteinG: number;
  readonly dailyCarbsG: number;
  readonly dailyFatG: number;
  readonly dailyFiberG: number;
  readonly restrictions: string[];
  readonly goals: string[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface MealSuggestion {
  readonly id: string;
  readonly profileId: string;
  readonly mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  readonly name: string;
  readonly calories: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
  readonly fiberG: number;
  readonly reason: string;
  readonly tags: string[];
  readonly equivalentSwaps: PortionSwap[];
  readonly createdAt: number;
}

export interface PortionSwap {
  readonly name: string;
  readonly calories: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
  readonly reason: string;
}

export function createNutritionProfile(params: {
  userId: string;
  ageRange?: AgeRange;
  activityLevel?: ActivityLevel;
  allergens?: string[];
  dailyCalories?: number;
  dailyProteinG?: number;
  dailyCarbsG?: number;
  dailyFatG?: number;
  dailyFiberG?: number;
  restrictions?: string[];
  goals?: string[];
}): NutritionProfile {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    userId: params.userId,
    ageRange: params.ageRange ?? '26-35',
    activityLevel: params.activityLevel ?? 'moderate',
    allergens: params.allergens ?? [],
    dailyCalories: params.dailyCalories ?? 2000,
    dailyProteinG: params.dailyProteinG ?? 50,
    dailyCarbsG: params.dailyCarbsG ?? 250,
    dailyFatG: params.dailyFatG ?? 65,
    dailyFiberG: params.dailyFiberG ?? 25,
    restrictions: params.restrictions ?? [],
    goals: params.goals ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createMealSuggestion(params: {
  profileId: string;
  mealType: MealSuggestion['mealType'];
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  reason: string;
  tags?: string[];
  equivalentSwaps?: PortionSwap[];
}): MealSuggestion {
  return {
    id: crypto.randomUUID(),
    profileId: params.profileId,
    mealType: params.mealType,
    name: params.name,
    calories: params.calories,
    proteinG: params.proteinG,
    carbsG: params.carbsG,
    fatG: params.fatG,
    fiberG: params.fiberG ?? 0,
    reason: params.reason,
    tags: params.tags ?? [],
    equivalentSwaps: params.equivalentSwaps ?? [],
    createdAt: Date.now(),
  };
}

export function computeRemainingBudget(
  profile: NutritionProfile,
  consumed: { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number }
): { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number } {
  return {
    calories: Math.max(0, profile.dailyCalories - consumed.calories),
    proteinG: Math.max(0, profile.dailyProteinG - consumed.proteinG),
    carbsG: Math.max(0, profile.dailyCarbsG - consumed.carbsG),
    fatG: Math.max(0, profile.dailyFatG - consumed.fatG),
    fiberG: Math.max(0, profile.dailyFiberG - consumed.fiberG),
  };
}

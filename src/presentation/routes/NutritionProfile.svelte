<script lang="ts">
  import { onMount } from 'svelte';
  import type { NutritionProfile as NP, MealSuggestion } from '@domain/models/nutrition';
  import { nutritionService } from '@services/container';
  import { currentUserId } from '../stores/auth-store';

  let profile = $state<NP | null>(null);
  let suggestions = $state<MealSuggestion[]>([]);
  let loading = $state(true);
  let error = $state('');

  // Form
  let ageRange = $state('26-35');
  let activityLevel = $state('moderate');
  let allergens = $state('');
  let calories = $state(2000);
  let proteinG = $state(50);
  let carbsG = $state(250);
  let fatG = $state(65);
  let fiberG = $state(25);
  let restrictions = $state('');
  let goals = $state('');

  async function loadData() {
    loading = true;
    try {
      if ($currentUserId) {
        profile = await nutritionService.getProfile($currentUserId);
        if (profile) {
          calories = profile.dailyCalories; proteinG = profile.dailyProteinG;
          carbsG = profile.dailyCarbsG; fatG = profile.dailyFatG; fiberG = profile.dailyFiberG;
          ageRange = profile.ageRange; activityLevel = profile.activityLevel;
          allergens = profile.allergens.join(', ');
          restrictions = profile.restrictions.join(', '); goals = profile.goals.join(', ');
          suggestions = await nutritionService.getSuggestions($currentUserId);
        }
      }
    } catch (e) { error = e instanceof Error ? e.message : 'Failed'; }
    finally { loading = false; }
  }

  onMount(loadData);

  async function saveProfile() {
    if (!$currentUserId) return;
    error = '';
    try {
      profile = await nutritionService.saveProfile({
        userId: $currentUserId, ageRange: ageRange as any, activityLevel: activityLevel as any,
        allergens: allergens.split(',').map(s => s.trim()).filter(Boolean),
        dailyCalories: calories, dailyProteinG: proteinG,
        dailyCarbsG: carbsG, dailyFatG: fatG, dailyFiberG: fiberG,
        restrictions: restrictions.split(',').map(s => s.trim()).filter(Boolean),
        goals: goals.split(',').map(s => s.trim()).filter(Boolean),
      });
    } catch (e) { error = e instanceof Error ? e.message : 'Failed'; }
  }

  async function generateSuggestions() {
    if (!$currentUserId) return;
    error = '';
    try {
      suggestions = await nutritionService.generateSuggestions($currentUserId);
    } catch (e) { error = e instanceof Error ? e.message : 'Failed'; }
  }

  let swapTarget = $state<string | null>(null);

  function toggleSwaps(id: string) {
    swapTarget = swapTarget === id ? null : id;
  }

  async function applySwap(suggestionId: string, swapIndex: number) {
    if (!$currentUserId) return;
    error = '';
    try {
      suggestions = await nutritionService.applySuggestionSwap($currentUserId, suggestionId, swapIndex);
      swapTarget = null;
    } catch (e) { error = e instanceof Error ? e.message : 'Swap failed'; }
  }

  let totalCalories = $derived(suggestions.reduce((s, m) => s + m.calories, 0));
  let totalProtein = $derived(suggestions.reduce((s, m) => s + m.proteinG, 0));

  const mealTypeLabel: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
</script>

<section class="nutrition">
  <h2>Healthy Eating Profile</h2>
  {#if error}<p class="error">{error}</p>{/if}

  <div class="profile-form">
    <h3>Daily Nutrition Budget</h3>
    <div class="form-row">
      <label>Age Range <select bind:value={ageRange}><option value="18-25">18-25</option><option value="26-35">26-35</option><option value="36-45">36-45</option><option value="46-55">46-55</option><option value="56-65">56-65</option><option value="65+">65+</option></select></label>
      <label>Activity Level <select bind:value={activityLevel}><option value="sedentary">Sedentary</option><option value="light">Light</option><option value="moderate">Moderate</option><option value="active">Active</option><option value="very_active">Very Active</option></select></label>
      <label>Allergens <input bind:value={allergens} placeholder="dairy, nuts, gluten" /></label>
    </div>
    <div class="form-row">
      <label>Calories <input type="number" bind:value={calories} /></label>
      <label>Protein (g) <input type="number" bind:value={proteinG} /></label>
      <label>Carbs (g) <input type="number" bind:value={carbsG} /></label>
      <label>Fat (g) <input type="number" bind:value={fatG} /></label>
      <label>Fiber (g) <input type="number" bind:value={fiberG} /></label>
    </div>
    <div class="form-row">
      <label>Restrictions <input bind:value={restrictions} placeholder="vegetarian, gluten-free" /></label>
      <label>Goals <input bind:value={goals} placeholder="weight-loss, muscle-gain" /></label>
    </div>
    <div class="form-actions">
      <button class="save-btn" onclick={saveProfile}>Save Profile</button>
      <button class="gen-btn" onclick={generateSuggestions}>Generate Meal Plan</button>
    </div>
  </div>

  {#if suggestions.length > 0}
    <div class="summary">
      <h3>Today's Plan</h3>
      <p class="totals">Total: {totalCalories} cal | {totalProtein}g protein | Budget remaining: {calories - totalCalories} cal</p>
    </div>

    <div class="meals">
      {#each suggestions as meal (meal.id)}
        <div class="meal-card">
          <div class="meal-header">
            <span class="meal-type">{mealTypeLabel[meal.mealType] ?? meal.mealType}</span>
            <span class="meal-name">{meal.name}</span>
            <span class="meal-cal">{meal.calories} cal</span>
          </div>
          <div class="meal-macros">
            <span>P: {meal.proteinG}g</span>
            <span>C: {meal.carbsG}g</span>
            <span>F: {meal.fatG}g</span>
            <span>Fiber: {meal.fiberG}g</span>
          </div>
          <p class="meal-reason">{meal.reason}</p>
          {#if meal.tags.length > 0}
            <div class="meal-tags">{#each meal.tags as t}<span class="tag">{t}</span>{/each}</div>
          {/if}
          {#if meal.equivalentSwaps.length > 0}
            <button class="swap-toggle" onclick={() => toggleSwaps(meal.id)}>
              {swapTarget === meal.id ? 'Hide' : 'Show'} Swaps ({meal.equivalentSwaps.length})
            </button>
            {#if swapTarget === meal.id}
              <div class="swaps">
                {#each meal.equivalentSwaps as swap, idx}
                  <div class="swap-card">
                    <div class="swap-info">
                      <strong>{swap.name}</strong> — {swap.calories} cal | P:{swap.proteinG}g C:{swap.carbsG}g F:{swap.fatG}g
                      <p class="swap-reason">{swap.reason}</p>
                    </div>
                    <button class="apply-btn" onclick={() => applySwap(meal.id, idx)}>Apply</button>
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
        </div>
      {/each}
    </div>
  {:else if !loading}
    <p class="empty">Save your profile and click "Generate Meal Plan" to get personalized suggestions.</p>
  {/if}
</section>

<style>
  .nutrition { padding: 1.5rem; max-width: 900px; margin: 0 auto; }
  h2 { margin: 0 0 1rem; }
  h3 { margin: 0 0 0.8rem; color: #8be9fd; font-size: 1rem; }
  .error { color: #ff5555; }
  .empty { color: #888; text-align: center; padding: 2rem; }
  .profile-form { background: #282a36; border: 1px solid #44475a; border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; }
  .form-row { display: flex; gap: 0.8rem; margin-bottom: 0.8rem; flex-wrap: wrap; }
  .form-row label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; color: #ccc; flex: 1; min-width: 100px; }
  .form-row input, .form-row select { padding: 0.4rem; background: #1a1a2e; border: 1px solid #44475a; border-radius: 4px; color: #f8f8f2; }
  .form-actions { display: flex; gap: 0.5rem; }
  .save-btn { padding: 0.5rem 1rem; background: #50fa7b; color: #282a36; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
  .gen-btn { padding: 0.5rem 1rem; background: #8be9fd; color: #282a36; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
  .summary { margin-bottom: 1rem; }
  .totals { font-size: 0.9rem; color: #ccc; margin: 0; }
  .meals { display: flex; flex-direction: column; gap: 0.8rem; }
  .meal-card { background: #282a36; border: 1px solid #44475a; border-radius: 8px; padding: 1rem; }
  .meal-header { display: flex; gap: 0.8rem; align-items: center; margin-bottom: 0.4rem; }
  .meal-type { font-size: 0.7rem; font-weight: 600; background: #6272a4; padding: 0.1rem 0.5rem; border-radius: 8px; color: #f8f8f2; text-transform: uppercase; }
  .meal-name { font-weight: 600; color: #f8f8f2; }
  .meal-cal { color: #ffb86c; font-size: 0.85rem; font-weight: 600; margin-left: auto; }
  .meal-macros { display: flex; gap: 0.8rem; font-size: 0.8rem; color: #888; margin-bottom: 0.3rem; }
  .meal-reason { margin: 0.3rem 0; font-size: 0.8rem; color: #50fa7b; font-style: italic; }
  .meal-tags { display: flex; gap: 0.3rem; flex-wrap: wrap; margin-bottom: 0.3rem; }
  .tag { font-size: 0.65rem; background: #44475a; padding: 0.1rem 0.4rem; border-radius: 8px; color: #ccc; }
  .swap-toggle { padding: 0.2rem 0.6rem; background: none; border: 1px solid #6272a4; color: #8be9fd; border-radius: 4px; cursor: pointer; font-size: 0.75rem; margin-top: 0.3rem; }
  .swaps { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.3rem; }
  .swap-card { padding: 0.5rem; background: #1a1a2e; border-radius: 6px; font-size: 0.8rem; color: #ccc; display: flex; align-items: flex-start; gap: 0.5rem; }
  .swap-info { flex: 1; }
  .apply-btn { padding: 0.3rem 0.6rem; background: #50fa7b; color: #282a36; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.75rem; white-space: nowrap; }
  .swap-reason { margin: 0.2rem 0 0; font-size: 0.75rem; color: #888; font-style: italic; }
</style>

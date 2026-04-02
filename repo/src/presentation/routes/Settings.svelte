<script lang="ts">
  import { onMount } from 'svelte';
  import { preferences, updatePreferences, toggleTheme } from '../stores/preferences-store';
  import { getQuietHoursLabel } from '@domain/policies/quiet-hours-policy';
  import { notificationService } from '@services/container';
  import { currentUserId, currentRole } from '../stores/auth-store';
  import type { NotificationSubscription } from '@domain/models/notification';
  import type { NotificationActor } from '@services/notification-service';
  import type { UserRole } from '@domain/models/user';

  let subscriptions = $state<NotificationSubscription[]>([]);
  const knownTemplates = ['grade_posted', 'hold_expiring', 'trip_update', 'system_alert'];

  function getActor(): NotificationActor {
    return { userId: $currentUserId ?? '', role: ($currentRole ?? 'dispatcher') as UserRole };
  }

  onMount(async () => {
    if ($currentUserId) {
      subscriptions = await notificationService.getSubscriptions($currentUserId, getActor());
    }
  });

  function isSubEnabled(templateId: string): boolean {
    const sub = subscriptions.find(s => s.templateId === templateId);
    return sub ? sub.enabled : true;
  }

  async function toggleSub(templateId: string) {
    if (!$currentUserId) return;
    const current = isSubEnabled(templateId);
    const actor = getActor();
    await notificationService.updateSubscription($currentUserId, templateId, !current, actor);
    subscriptions = await notificationService.getSubscriptions($currentUserId, actor);
  }
</script>

<section class="settings">
  <h2>Settings</h2>

  <div class="setting">
    <label>
      <span>Theme</span>
      <button onclick={toggleTheme}>
        Switch to {$preferences.theme === 'light' ? 'Dark' : 'Light'}
      </button>
    </label>
  </div>

  <div class="setting">
    <label>
      <span>Show Scores on Grid</span>
      <input
        type="checkbox"
        checked={$preferences.showScores}
        onchange={(e) => updatePreferences({ showScores: (e.target as HTMLInputElement).checked })}
      />
    </label>
  </div>

  <div class="setting">
    <label>
      <span>Passing Score Threshold</span>
      <input
        type="number" min="0" max="100"
        value={$preferences.scoringThreshold}
        onchange={(e) => updatePreferences({ scoringThreshold: parseInt((e.target as HTMLInputElement).value) || 60 })}
      />
    </label>
  </div>

  <h3>Quiet Hours</h3>
  <p class="quiet-label">Current: {getQuietHoursLabel($preferences.quietHours)}</p>

  <div class="setting">
    <label>
      <span>Enable Quiet Hours</span>
      <input
        type="checkbox"
        checked={$preferences.quietHours.enabled}
        onchange={(e) => updatePreferences({ quietHours: { ...$preferences.quietHours, enabled: (e.target as HTMLInputElement).checked } })}
      />
    </label>
  </div>

  <div class="setting">
    <label>
      <span>Start Time</span>
      <input
        type="time"
        value={$preferences.quietHours.start}
        onchange={(e) => updatePreferences({ quietHours: { ...$preferences.quietHours, start: (e.target as HTMLInputElement).value } })}
      />
    </label>
  </div>

  <div class="setting">
    <label>
      <span>End Time</span>
      <input
        type="time"
        value={$preferences.quietHours.end}
        onchange={(e) => updatePreferences({ quietHours: { ...$preferences.quietHours, end: (e.target as HTMLInputElement).value } })}
      />
    </label>
  </div>

  <h3>Grading</h3>
  <div class="setting">
    <label>
      <span>Rounding Increment</span>
      <select
        value={$preferences.gradingConfig.roundingIncrement}
        onchange={(e) => updatePreferences({ gradingConfig: { ...$preferences.gradingConfig, roundingIncrement: parseFloat((e.target as HTMLSelectElement).value) } })}
      >
        <option value="0.25">0.25</option>
        <option value="0.5">0.5</option>
        <option value="1">1.0</option>
      </select>
    </label>
  </div>
  <div class="setting">
    <label>
      <span>Essay Weight</span>
      <input type="number" min="0.5" max="5" step="0.5"
        value={$preferences.gradingConfig.typeWeights['essay'] ?? 2}
        onchange={(e) => updatePreferences({ gradingConfig: { ...$preferences.gradingConfig, typeWeights: { ...$preferences.gradingConfig.typeWeights, essay: parseFloat((e.target as HTMLInputElement).value) || 2 } } })}
      />
    </label>
  </div>
  <div class="setting">
    <label>
      <span>Short Answer Weight</span>
      <input type="number" min="0.5" max="5" step="0.5"
        value={$preferences.gradingConfig.typeWeights['short_answer'] ?? 1.5}
        onchange={(e) => updatePreferences({ gradingConfig: { ...$preferences.gradingConfig, typeWeights: { ...$preferences.gradingConfig.typeWeights, short_answer: parseFloat((e.target as HTMLInputElement).value) || 1.5 } } })}
      />
    </label>
  </div>

  <h3>Notification Subscriptions</h3>
  {#each knownTemplates as tplId}
    <div class="setting">
      <label>
        <span>{tplId.replace(/_/g, ' ')}</span>
        <input
          type="checkbox"
          checked={isSubEnabled(tplId)}
          onchange={() => toggleSub(tplId)}
        />
      </label>
    </div>
  {/each}

  <h3>Language</h3>
  <div class="setting">
    <label>
      <span>UI Language</span>
      <select
        value={$preferences.uiLanguage}
        onchange={(e) => updatePreferences({ uiLanguage: (e.target as HTMLSelectElement).value })}
      >
        <option value="en">English</option>
      </select>
    </label>
  </div>
</section>

<style>
  .settings {
    padding: 2rem;
    max-width: 600px;
    margin: 0 auto;
  }
  h2 { margin-bottom: 1.5rem; }
  h3 {
    margin: 1.5rem 0 0.5rem;
    font-size: 1rem;
    color: #8be9fd;
  }
  .quiet-label {
    color: #888;
    font-size: 0.85rem;
    margin: 0 0 1rem;
  }
  .setting { margin-bottom: 0.8rem; }
  label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.7rem 1rem;
    background: #282a36;
    border-radius: 8px;
    border: 1px solid #44475a;
  }
  label span { color: #f8f8f2; }
  button {
    padding: 0.4rem 0.8rem;
    background: #8be9fd;
    color: #282a36;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
  }
  input[type='number'], input[type='time'] {
    width: 90px;
    padding: 0.3rem 0.5rem;
    background: #1a1a2e;
    border: 1px solid #44475a;
    border-radius: 4px;
    color: #f8f8f2;
    text-align: center;
  }
  select {
    padding: 0.3rem 0.5rem;
    background: #1a1a2e;
    border: 1px solid #44475a;
    border-radius: 4px;
    color: #f8f8f2;
  }
  input[type='checkbox'] {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }
</style>

<script lang="ts">
  import ModalShell from './ModalShell.svelte';
  import { addTrip } from '../stores/trip-store';
  import { venues, loadVenues } from '../stores/venue-store';
  import { currentUserId, currentRole } from '../stores/auth-store';
  import type { UserRole } from '@domain/models/user';
  import { closeModal } from '../stores/modal-store';
  import { onMount } from 'svelte';

  let name = $state('');
  let venueId = $state('');
  let departureStr = $state('');
  let description = $state('');
  let formError = $state('');

  onMount(() => {
    loadVenues();
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    if (!name.trim()) { formError = 'Name is required'; return; }
    if (!venueId) { formError = 'Select a venue'; return; }
    if (!departureStr) { formError = 'Departure time is required'; return; }
    const departureTime = new Date(departureStr).getTime();
    if (isNaN(departureTime)) { formError = 'Invalid date'; return; }

    try {
      await addTrip(venueId, name.trim(), departureTime, $currentUserId ?? '', { userId: $currentUserId ?? '', role: ($currentRole ?? 'dispatcher') as UserRole }, description.trim());
      closeModal();
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Failed to create trip';
    }
  }
</script>

<ModalShell title="Create Trip">
  <form onsubmit={handleSubmit}>
    {#if formError}
      <p class="error">{formError}</p>
    {/if}
    <label>
      Trip Name
      <input type="text" bind:value={name} placeholder="e.g. Morning Express" />
    </label>
    <label>
      Venue
      <select bind:value={venueId}>
        <option value="">-- Select Venue --</option>
        {#each $venues as v}
          <option value={v.id}>{v.name} ({v.rows}x{v.seatsPerRow})</option>
        {/each}
      </select>
    </label>
    <label>
      Departure Time
      <input type="datetime-local" bind:value={departureStr} />
    </label>
    <label>
      Description (optional)
      <textarea bind:value={description} rows="2" placeholder="Notes..."></textarea>
    </label>
    <div class="actions">
      <button type="button" class="cancel" onclick={closeModal}>Cancel</button>
      <button type="submit" class="submit">Create</button>
    </div>
  </form>
</ModalShell>

<style>
  form { display: flex; flex-direction: column; gap: 1rem; }
  label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.9rem; color: #ccc; }
  input, select, textarea {
    padding: 0.5rem; border: 1px solid #44475a; border-radius: 6px;
    background: #1a1a2e; color: #f8f8f2; font-size: 1rem; font-family: inherit;
  }
  textarea { resize: vertical; }
  .error { color: #ff5555; font-size: 0.85rem; margin: 0; }
  .actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem; }
  button { padding: 0.5rem 1.2rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
  .cancel { background: #44475a; color: #f8f8f2; }
  .submit { background: #50fa7b; color: #282a36; }
</style>

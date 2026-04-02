<script lang="ts">
  import ModalShell from './ModalShell.svelte';
  import { addVenue } from '../stores/venue-store';
  import { closeModal } from '../stores/modal-store';
  import { config } from '@config/index';
  import { currentUserId, currentRole } from '../stores/auth-store';
  import type { UserRole } from '@domain/models/user';

  function getActor() { return { userId: $currentUserId ?? '', role: ($currentRole ?? 'dispatcher') as UserRole }; }

  let name = $state('');
  let rows = $state(config.seats.defaultRows);
  let seatsPerRow = $state(config.seats.defaultSeatsPerRow);
  let formError = $state('');

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    if (!name.trim()) {
      formError = 'Name is required';
      return;
    }
    if (rows < 1 || seatsPerRow < 1) {
      formError = 'Rows and seats must be at least 1';
      return;
    }
    try {
      await addVenue(name.trim(), rows, seatsPerRow, getActor());
      closeModal();
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Failed to create venue';
    }
  }
</script>

<ModalShell title="Create Venue">
  <form onsubmit={handleSubmit}>
    {#if formError}
      <p class="error">{formError}</p>
    {/if}
    <label>
      Venue Name
      <input type="text" bind:value={name} placeholder="e.g. Main Hall" />
    </label>
    <label>
      Rows
      <input type="number" bind:value={rows} min="1" max="50" />
    </label>
    <label>
      Seats Per Row
      <input type="number" bind:value={seatsPerRow} min="1" max="100" />
    </label>
    <div class="actions">
      <button type="button" class="cancel" onclick={closeModal}>Cancel</button>
      <button type="submit" class="submit">Create</button>
    </div>
  </form>
</ModalShell>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.9rem;
    color: #ccc;
  }
  input {
    padding: 0.5rem;
    border: 1px solid #44475a;
    border-radius: 6px;
    background: #1a1a2e;
    color: #f8f8f2;
    font-size: 1rem;
  }
  .error {
    color: #ff5555;
    font-size: 0.85rem;
    margin: 0;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }
  button {
    padding: 0.5rem 1.2rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
  }
  .cancel {
    background: #44475a;
    color: #f8f8f2;
  }
  .submit {
    background: #50fa7b;
    color: #282a36;
  }
</style>

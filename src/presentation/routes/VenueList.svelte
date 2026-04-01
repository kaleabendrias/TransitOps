<script lang="ts">
  import { onMount } from 'svelte';
  import { venues, loading, error, loadVenues, removeVenue } from '../stores/venue-store';
  import { openModal } from '../stores/modal-store';
  import { currentUserId, currentRole } from '../stores/auth-store';
  import type { UserRole } from '@domain/models/user';

  function getActor() { return { userId: $currentUserId ?? '', role: ($currentRole ?? 'dispatcher') as UserRole }; }

  onMount(() => {
    loadVenues();
  });

  function handleDelete(id: string, name: string) {
    openModal('confirm', {
      message: `Delete venue "${name}" and all its seats?`,
      onConfirm: () => removeVenue(id, getActor()),
    });
  }
</script>

<section class="venue-list">
  <div class="header-row">
    <h2>Venues</h2>
    <button class="create-btn" onclick={() => openModal('createVenue')}>+ New Venue</button>
  </div>

  {#if $error}
    <p class="error">{$error}</p>
  {/if}

  {#if $loading}
    <p class="loading">Loading...</p>
  {:else if $venues.length === 0}
    <p class="empty">No venues yet. Create one to get started.</p>
  {:else}
    <div class="cards">
      {#each $venues as venue (venue.id)}
        <div class="card">
          <h3>{venue.name}</h3>
          <p>{venue.rows} rows &times; {venue.seatsPerRow} seats = {venue.rows * venue.seatsPerRow} total</p>
          <div class="card-actions">
            <a href="#/venue/{venue.id}" class="view-btn">View Seats</a>
            <button class="delete-btn" onclick={() => handleDelete(venue.id, venue.name)}>Delete</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .venue-list {
    padding: 2rem;
    max-width: 900px;
    margin: 0 auto;
  }
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  h2 {
    margin: 0;
  }
  .create-btn {
    padding: 0.5rem 1.2rem;
    background: #50fa7b;
    color: #282a36;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
  }
  .error {
    color: #ff5555;
  }
  .loading, .empty {
    color: #888;
    text-align: center;
    padding: 2rem;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }
  .card {
    background: #282a36;
    border-radius: 10px;
    padding: 1.2rem;
    border: 1px solid #44475a;
  }
  .card h3 {
    margin: 0 0 0.5rem;
    color: #f8f8f2;
  }
  .card p {
    color: #ccc;
    font-size: 0.9rem;
    margin: 0 0 1rem;
  }
  .card-actions {
    display: flex;
    gap: 0.5rem;
  }
  .view-btn {
    padding: 0.4rem 0.8rem;
    background: #8be9fd;
    color: #282a36;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.85rem;
  }
  .delete-btn {
    padding: 0.4rem 0.8rem;
    background: #ff5555;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.85rem;
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import { trips, tripLoading, tripError, loadTrips, removeTrip } from '../stores/trip-store';
  import { venues, loadVenues } from '../stores/venue-store';
  import { currentRole, currentUserId, checkPermission } from '../stores/auth-store';
  import { openModal } from '../stores/modal-store';
  import type { UserRole } from '@domain/models/user';

  onMount(() => {
    loadTrips();
    loadVenues();
  });

  function getActor() { return { userId: $currentUserId ?? '', role: ($currentRole ?? 'dispatcher') as UserRole }; }

  function handleDelete(id: string, name: string) {
    openModal('confirm', {
      message: `Delete trip "${name}"?`,
      onConfirm: () => removeTrip(id, getActor()),
    });
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleString();
  }
</script>

<section class="trip-list">
  <div class="header-row">
    <h2>Trips</h2>
    {#if checkPermission($currentRole, 'manage_trips')}
      <button class="create-btn" onclick={() => openModal('createTrip')}>+ New Trip</button>
    {/if}
  </div>

  {#if $tripError}
    <p class="error">{$tripError}</p>
  {/if}

  {#if $tripLoading}
    <p class="loading">Loading...</p>
  {:else if $trips.length === 0}
    <p class="empty">No trips yet. Create one to get started.</p>
  {:else}
    <div class="cards">
      {#each $trips as trip (trip.id)}
        {@const venue = $venues.find(v => v.id === trip.venueId)}
        <div class="card">
          <div class="card-header">
            <h3>{trip.name}</h3>
            <span class="status-pill {trip.status}">{trip.status}</span>
          </div>
          {#if trip.description}
            <p class="desc">{trip.description}</p>
          {/if}
          <p class="meta">
            Venue: {venue?.name ?? 'Unknown'}<br />
            Departure: {formatDate(trip.departureTime)}
          </p>
          <div class="card-actions">
            {#if checkPermission($currentRole, 'manage_seats')}
              <a href="#/trip/{trip.id}/seats" class="view-btn">Seat Map</a>
            {/if}
            {#if checkPermission($currentRole, 'manage_trips')}
              <button class="delete-btn" onclick={() => handleDelete(trip.id, trip.name)}>Delete</button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .trip-list {
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
  h2 { margin: 0; }
  .create-btn {
    padding: 0.5rem 1.2rem;
    background: #50fa7b;
    color: #282a36;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
  }
  .error { color: #ff5555; }
  .loading, .empty {
    color: #888;
    text-align: center;
    padding: 2rem;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }
  .card {
    background: #282a36;
    border-radius: 10px;
    padding: 1.2rem;
    border: 1px solid #44475a;
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .card h3 {
    margin: 0;
    color: #f8f8f2;
  }
  .status-pill {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    padding: 0.15rem 0.5rem;
    border-radius: 10px;
    color: #fff;
  }
  .status-pill.draft { background: #6272a4; }
  .status-pill.published { background: #50fa7b; color: #282a36; }
  .status-pill.boarding { background: #ffb86c; color: #282a36; }
  .status-pill.departed { background: #ff79c6; }
  .status-pill.completed { background: #8be9fd; color: #282a36; }
  .status-pill.cancelled { background: #ff5555; }
  .desc {
    color: #aaa;
    font-size: 0.85rem;
    margin: 0 0 0.5rem;
  }
  .meta {
    color: #888;
    font-size: 0.85rem;
    margin: 0 0 1rem;
    line-height: 1.5;
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

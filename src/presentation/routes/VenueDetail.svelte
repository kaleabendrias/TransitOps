<script lang="ts">
  import { onMount } from 'svelte';
  import type { Venue } from '@domain/models/venue';
  import { seats, seatLoading, seatError, loadSeats } from '../stores/seat-store';
  import { venueService } from '@services/container';
  import SeatGrid from '../components/SeatGrid.svelte';

  interface Props {
    params: { id: string };
  }

  let { params }: Props = $props();

  let venue = $state<Venue | null>(null);

  onMount(async () => {
    venue = await venueService.getVenue(params.id);
    if (venue) {
      await loadSeats(venue.id);
    }
  });
</script>

<section class="venue-detail">
  <a href="#/" class="back">&larr; Back to Venues</a>

  {#if !venue}
    <p class="loading">Loading venue...</p>
  {:else}
    <h2>{venue.name}</h2>
    <p class="meta">{venue.rows} rows &times; {venue.seatsPerRow} seats per row</p>

    <div class="legend">
      <span class="legend-item"><span class="dot available"></span> Available</span>
      <span class="legend-item"><span class="dot reserved"></span> Reserved</span>
      <span class="legend-item"><span class="dot occupied"></span> Occupied</span>
      <span class="legend-item"><span class="dot blocked"></span> Blocked</span>
    </div>

    {#if $seatError}
      <p class="error">{$seatError}</p>
    {/if}

    {#if $seatLoading}
      <p class="loading">Loading seats...</p>
    {:else}
      <SeatGrid seats={$seats} rows={venue.rows} seatsPerRow={venue.seatsPerRow} />
    {/if}
  {/if}
</section>

<style>
  .venue-detail {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  .back {
    color: #8be9fd;
    text-decoration: none;
    font-size: 0.9rem;
  }
  .back:hover {
    text-decoration: underline;
  }
  h2 {
    margin: 1rem 0 0.3rem;
  }
  .meta {
    color: #888;
    margin: 0 0 1rem;
  }
  .legend {
    display: flex;
    gap: 1.2rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.85rem;
    color: #ccc;
  }
  .dot {
    width: 14px;
    height: 14px;
    border-radius: 4px;
  }
  .dot.available { background: #6272a4; }
  .dot.reserved { background: #ffb86c; }
  .dot.occupied { background: #ff5555; }
  .dot.blocked { background: #44475a; }
  .error {
    color: #ff5555;
  }
  .loading {
    color: #888;
    text-align: center;
    padding: 2rem;
  }
</style>

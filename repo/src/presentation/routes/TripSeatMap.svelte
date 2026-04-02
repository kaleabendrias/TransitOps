<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Trip } from '@domain/models/trip';
  import type { SeatMapEntry, SeatType } from '@domain/models/seat-map';
  import type { Hold } from '@domain/models/hold';
  import { ALL_SEAT_TYPES, SEAT_TYPE_LABELS } from '@domain/models/seat-map';
  import { tripService, seatMapService, holdService } from '@services/container';
  import { venueService } from '@services/container';
  import type { Venue } from '@domain/models/venue';
  import { currentUserId, currentRole, checkPermission } from '../stores/auth-store';
  import type { UserRole } from '@domain/models/user';

  function getActor() { return { userId: $currentUserId ?? '', role: ($currentRole ?? 'dispatcher') as UserRole }; }
  import { activeHolds, holdError, initHoldStore, destroyHoldStore, placeHold, releaseHold, confirmHold } from '../stores/hold-store';
  import SeatMapGrid from '../components/SeatMapGrid.svelte';
  import AvailabilityBar from '../components/AvailabilityBar.svelte';
  import HoldCountdown from '../components/HoldCountdown.svelte';

  interface Props {
    params: { id: string };
  }

  let { params }: Props = $props();

  let trip = $state<Trip | null>(null);
  let venue = $state<Venue | null>(null);
  let seatMap = $state<SeatMapEntry[]>([]);
  let confirmedSeatIds = $state<Set<string>>(new Set());
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Availability counts
  let counts = $state({ total: 0, selectable: 0, available: 0, held: 0, confirmed: 0, nonSelectable: 0 });

  // Edit mode state
  let editMode = $state(false);
  let selectedSeat = $state<SeatMapEntry | null>(null);
  let myHolds = $derived(
    ($activeHolds).filter((h: Hold) => h.userId === $currentUserId && h.status === 'active')
  );

  // Generate seat map state
  let showGenerate = $state(false);
  let genRows = $state(10);
  let genCols = $state(20);
  let genAdaRows = $state('');
  let genCrewRows = $state('');

  async function loadData() {
    loading = true;
    error = null;
    try {
      trip = await tripService.getTrip(params.id);
      if (!trip) { error = 'Trip not found'; return; }
      venue = await venueService.getVenue(trip.venueId);
      seatMap = await seatMapService.getSeatMap(trip.id);
      counts = await seatMapService.getAvailabilityCounts(trip.id);
      initHoldStore(trip.id);

      confirmedSeatIds = await holdService.getConfirmedSeatIds(trip.id);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load trip';
    } finally {
      loading = false;
    }
  }

  // Re-sync when holds change
  let unsubHoldChange: (() => void) | null = null;
  onMount(() => {
    loadData();
    unsubHoldChange = holdService.onChange(async () => {
      if (trip) {
        seatMap = await seatMapService.getSeatMap(trip.id);
        counts = await seatMapService.getAvailabilityCounts(trip.id);
      }
    });
  });

  onDestroy(() => {
    destroyHoldStore();
    unsubHoldChange?.();
  });

  async function handleSeatClick(seat: SeatMapEntry) {
    if (editMode) {
      selectedSeat = seat;
      return;
    }
    // Check if user already holds this seat
    const existingHold = ($activeHolds).find(
      (h: Hold) => h.seatMapEntryId === seat.id && h.userId === $currentUserId
    );
    if (existingHold) {
      selectedSeat = seat;
      return;
    }
    // Try to place a hold
    if (!$currentUserId || !trip) return;
    try {
      await placeHold(trip.id, seat.id, $currentUserId);
      selectedSeat = seat;
    } catch {
      // Error displayed via holdError
    }
  }

  async function handleChangeSeatType(entryId: string, seatType: SeatType) {
    try {
      await seatMapService.changeSeatType(entryId, seatType, getActor());
      if (trip) {
        seatMap = await seatMapService.getSeatMap(trip.id);
        counts = await seatMapService.getAvailabilityCounts(trip.id);
      }
      selectedSeat = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to update seat type';
    }
  }

  async function handleGenerateSeatMap() {
    if (!trip) return;
    const adaRows = genAdaRows.split(',').map(Number).filter(Boolean);
    const crewRows = genCrewRows.split(',').map(Number).filter(Boolean);
    try {
      seatMap = await seatMapService.generateSeatMap(trip.id, genRows, genCols, adaRows, crewRows, getActor());
      counts = await seatMapService.getAvailabilityCounts(trip.id);
      showGenerate = false;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to generate seat map';
    }
  }

  function getHoldForSeat(seatId: string): Hold | undefined {
    return ($activeHolds).find((h: Hold) => h.seatMapEntryId === seatId && h.status === 'active');
  }
</script>

<section class="trip-seat-map">
  <a href="#/trips" class="back">&larr; Back to Trips</a>

  {#if loading}
    <p class="loading">Loading...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if trip}
    <div class="trip-header">
      <div>
        <h2>{trip.name}</h2>
        <p class="meta">Venue: {venue?.name ?? '—'} &middot; Status: {trip.status}</p>
      </div>
      <div class="actions">
        {#if checkPermission($currentRole, 'manage_seats')}
          <button
            class="edit-toggle"
            class:active={editMode}
            onclick={() => { editMode = !editMode; selectedSeat = null; }}
          >
            {editMode ? 'Exit Edit Mode' : 'Edit Seat Types'}
          </button>
          <button class="gen-btn" onclick={() => { showGenerate = !showGenerate; }}>
            {showGenerate ? 'Cancel' : seatMap.length ? 'Regenerate' : 'Generate'} Seat Map
          </button>
        {/if}
      </div>
    </div>

    {#if showGenerate}
      <div class="generate-form">
        <label>Rows <input type="number" bind:value={genRows} min="1" max="50" /></label>
        <label>Seats/Row <input type="number" bind:value={genCols} min="1" max="50" /></label>
        <label>ADA Rows <input type="text" bind:value={genAdaRows} placeholder="e.g. 1,2" /></label>
        <label>Crew Rows <input type="text" bind:value={genCrewRows} placeholder="e.g. 10" /></label>
        <button class="submit-gen" onclick={handleGenerateSeatMap}>Generate</button>
      </div>
    {/if}

    {#if $holdError}
      <p class="error">{$holdError}</p>
    {/if}

    {#if seatMap.length > 0}
      <AvailabilityBar
        total={counts.total}
        available={counts.available}
        held={counts.held}
        confirmed={counts.confirmed}
        nonSelectable={counts.nonSelectable}
      />

      <div class="layout">
        <div class="grid-panel">
          <SeatMapGrid
            seats={seatMap}
            holds={$activeHolds}
            {confirmedSeatIds}
            rows={venue?.rows ?? Math.max(...seatMap.map(s => s.row))}
            seatsPerRow={venue?.seatsPerRow ?? Math.max(...seatMap.map(s => s.number))}
            currentUserId={$currentUserId}
            onSeatClick={handleSeatClick}
            {editMode}
          />
        </div>

        <aside class="side-panel">
          {#if editMode && selectedSeat}
            <div class="panel-card">
              <h3>Edit Seat</h3>
              <p>{selectedSeat.label}</p>
              <p>Type: <strong>{SEAT_TYPE_LABELS[selectedSeat.seatType]}</strong></p>
              <p>Selectable: {selectedSeat.selectable ? 'Yes' : 'No'}</p>
              <div class="type-buttons">
                {#each ALL_SEAT_TYPES as st}
                  <button
                    class="type-btn"
                    class:active={selectedSeat.seatType === st}
                    onclick={() => selectedSeat && handleChangeSeatType(selectedSeat.id, st)}
                  >
                    {SEAT_TYPE_LABELS[st]}
                  </button>
                {/each}
              </div>
            </div>
          {:else if !editMode && selectedSeat}
            {@const seatHold = getHoldForSeat(selectedSeat.id)}
            <div class="panel-card">
              <h3>{selectedSeat.label}</h3>
              <p>Type: {SEAT_TYPE_LABELS[selectedSeat.seatType]}</p>
              <p>Score: {selectedSeat.score}/100</p>

              {#if seatHold && seatHold.userId === $currentUserId}
                <div class="hold-info">
                  <p class="hold-label">Your Hold</p>
                  <HoldCountdown hold={seatHold} onExpired={() => { selectedSeat = null; }} />
                  <div class="hold-actions">
                    <button class="confirm-btn" onclick={() => seatHold && $currentUserId && confirmHold(seatHold.id, $currentUserId)}>
                      Confirm
                    </button>
                    <button class="release-btn" onclick={() => seatHold && $currentUserId && releaseHold(seatHold.id, $currentUserId)}>
                      Release
                    </button>
                  </div>
                </div>
              {:else if seatHold}
                <p class="held-other">Held by another user</p>
              {:else if confirmedSeatIds.has(selectedSeat.id)}
                <p class="confirmed-label">Confirmed / Booked</p>
              {:else}
                <p class="available-label">Available</p>
              {/if}
            </div>
          {:else}
            <div class="panel-card">
              <h3>Seat Details</h3>
              <p class="hint">Click a seat to view details{editMode ? ' or change its type' : ' or place a hold'}.</p>
            </div>
          {/if}

          {#if myHolds.length > 0 && !editMode}
            <div class="panel-card">
              <h3>Your Active Holds ({myHolds.length})</h3>
              {#each myHolds as hold (hold.id)}
                {@const heldSeat = seatMap.find(s => s.id === hold.seatMapEntryId)}
                <div class="hold-row">
                  <span>{heldSeat?.label ?? hold.seatMapEntryId}</span>
                  <HoldCountdown {hold} />
                </div>
              {/each}
            </div>
          {/if}
        </aside>
      </div>
    {:else}
      <p class="empty">No seat map generated yet. Click "Generate Seat Map" to create one.</p>
    {/if}
  {/if}
</section>

<style>
  .trip-seat-map {
    padding: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
  }
  .back {
    color: #8be9fd;
    text-decoration: none;
    font-size: 0.9rem;
  }
  .back:hover { text-decoration: underline; }
  .trip-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin: 1rem 0;
    flex-wrap: wrap;
    gap: 1rem;
  }
  h2 { margin: 0; }
  .meta { color: #888; margin: 0.3rem 0 0; font-size: 0.9rem; }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .edit-toggle, .gen-btn {
    padding: 0.4rem 0.8rem;
    border: 1px solid #6272a4;
    border-radius: 6px;
    background: none;
    color: #f8f8f2;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
  }
  .edit-toggle.active {
    background: #6272a4;
  }
  .gen-btn {
    border-color: #8be9fd;
    color: #8be9fd;
  }
  .generate-form {
    display: flex;
    gap: 0.8rem;
    align-items: flex-end;
    flex-wrap: wrap;
    padding: 1rem;
    background: #282a36;
    border-radius: 8px;
    margin-bottom: 1rem;
    border: 1px solid #44475a;
  }
  .generate-form label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.8rem;
    color: #ccc;
  }
  .generate-form input {
    padding: 0.4rem;
    border: 1px solid #44475a;
    border-radius: 4px;
    background: #1a1a2e;
    color: #f8f8f2;
    width: 80px;
    font-size: 0.9rem;
  }
  .generate-form input[type="text"] { width: 120px; }
  .submit-gen {
    padding: 0.4rem 1rem;
    background: #50fa7b;
    color: #282a36;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
  }
  .error { color: #ff5555; font-size: 0.9rem; }
  .loading, .empty { color: #888; text-align: center; padding: 2rem; }
  .layout {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
  }
  .grid-panel { flex: 1; overflow-x: auto; }
  .side-panel {
    width: 280px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .panel-card {
    background: #282a36;
    border: 1px solid #44475a;
    border-radius: 8px;
    padding: 1rem;
  }
  .panel-card h3 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    color: #8be9fd;
  }
  .panel-card p {
    margin: 0.3rem 0;
    font-size: 0.85rem;
    color: #ccc;
  }
  .hint { color: #666; font-style: italic; }
  .type-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-top: 0.8rem;
  }
  .type-btn {
    padding: 0.4rem;
    border: 1px solid #44475a;
    border-radius: 4px;
    background: #1a1a2e;
    color: #f8f8f2;
    cursor: pointer;
    font-size: 0.8rem;
    text-align: left;
  }
  .type-btn.active {
    border-color: #8be9fd;
    background: rgba(139, 233, 253, 0.12);
    color: #8be9fd;
    font-weight: 600;
  }
  .hold-info {
    margin-top: 0.8rem;
    padding-top: 0.8rem;
    border-top: 1px solid #44475a;
  }
  .hold-label {
    color: #ffb86c !important;
    font-weight: 600;
    margin-bottom: 0.3rem !important;
  }
  .hold-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }
  .confirm-btn {
    padding: 0.4rem 0.8rem;
    background: #50fa7b;
    color: #282a36;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.8rem;
  }
  .release-btn {
    padding: 0.4rem 0.8rem;
    background: none;
    border: 1px solid #ff5555;
    color: #ff5555;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .held-other {
    color: #ff6e6e !important;
    font-weight: 500;
    margin-top: 0.5rem !important;
  }
  .confirmed-label {
    color: #ff5555 !important;
    font-weight: 600;
  }
  .available-label {
    color: #50fa7b !important;
    font-weight: 600;
  }
  .hold-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.4rem 0;
    font-size: 0.8rem;
    color: #ccc;
    border-bottom: 1px solid #44475a;
  }
  .hold-row:last-child { border-bottom: none; }

  @media (max-width: 900px) {
    .layout {
      flex-direction: column;
    }
    .side-panel {
      width: 100%;
    }
  }
</style>

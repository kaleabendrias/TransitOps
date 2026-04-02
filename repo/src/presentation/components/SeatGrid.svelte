<script lang="ts">
  import type { Seat } from '@domain/models/seat';
  import { isPassingScore } from '@domain/scoring';
  import { preferences } from '../stores/preferences-store';
  import { selectedSeat } from '../stores/seat-store';
  import { openModal } from '../stores/modal-store';

  interface Props {
    seats: Seat[];
    rows: number;
    seatsPerRow: number;
  }

  let { seats, rows, seatsPerRow }: Props = $props();

  function getSeat(row: number, num: number): Seat | undefined {
    return seats.find((s) => s.row === row && s.number === num);
  }

  function statusColor(seat: Seat): string {
    switch (seat.status) {
      case 'available':
        return $preferences.showScores && isPassingScore(seat.score, $preferences.scoringThreshold)
          ? '#50fa7b'
          : '#6272a4';
      case 'reserved':
        return '#ffb86c';
      case 'occupied':
        return '#ff5555';
      case 'blocked':
        return '#44475a';
      default:
        return '#6272a4';
    }
  }

  function handleClick(seat: Seat) {
    selectedSeat.set(seat);
    openModal('seatDetail', { seat });
  }
</script>

<div class="grid">
  {#each Array.from({ length: rows }, (_, i) => i + 1) as row}
    <div class="row">
      <span class="row-label">R{row}</span>
      {#each Array.from({ length: seatsPerRow }, (_, i) => i + 1) as num}
        {@const seat = getSeat(row, num)}
        {#if seat}
          <button
            class="seat"
            style="background-color: {statusColor(seat)}"
            title="{seat.label} — {seat.status} (Score: {seat.score})"
            onclick={() => handleClick(seat)}
          >
            {#if $preferences.showScores}
              {seat.score}
            {:else}
              {num}
            {/if}
          </button>
        {:else}
          <span class="seat empty"></span>
        {/if}
      {/each}
    </div>
  {/each}
</div>

<style>
  .grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 1rem;
    overflow-x: auto;
  }
  .row {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .row-label {
    width: 3rem;
    font-weight: 600;
    font-size: 0.8rem;
    color: #888;
  }
  .seat {
    width: 2.5rem;
    height: 2.5rem;
    border: none;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.1s;
  }
  .seat:hover {
    transform: scale(1.15);
  }
  .seat.empty {
    visibility: hidden;
  }
</style>

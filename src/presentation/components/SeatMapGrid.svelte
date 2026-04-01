<script lang="ts">
  import type { SeatMapEntry } from '@domain/models/seat-map';
  import type { Hold } from '@domain/models/hold';
  import { SEAT_TYPE_LABELS } from '@domain/models/seat-map';
  import { preferences } from '../stores/preferences-store';

  interface Props {
    seats: SeatMapEntry[];
    holds: Hold[];
    confirmedSeatIds: Set<string>;
    rows: number;
    seatsPerRow: number;
    currentUserId: string | null;
    onSeatClick: (seat: SeatMapEntry) => void;
    editMode?: boolean;
  }

  let {
    seats,
    holds,
    confirmedSeatIds,
    rows,
    seatsPerRow,
    currentUserId,
    onSeatClick,
    editMode = false,
  }: Props = $props();

  function getSeat(row: number, num: number): SeatMapEntry | undefined {
    return seats.find((s) => s.row === row && s.number === num);
  }

  function getHoldForSeat(seatId: string): Hold | undefined {
    return holds.find((h) => h.seatMapEntryId === seatId && h.status === 'active');
  }

  function seatColor(seat: SeatMapEntry): string {
    if (!seat.selectable) {
      if (seat.seatType === 'ada') return '#bd93f9';
      if (seat.seatType === 'crew') return '#ff79c6';
      return '#44475a';
    }

    if (confirmedSeatIds.has(seat.id)) return '#ff5555';

    const hold = getHoldForSeat(seat.id);
    if (hold) {
      return hold.userId === currentUserId ? '#ffb86c' : '#ff6e6e';
    }

    if ($preferences.showScores && seat.score >= $preferences.scoringThreshold) {
      return '#50fa7b';
    }

    return '#6272a4';
  }

  function seatLabel(seat: SeatMapEntry): string {
    if (!seat.selectable) return seat.seatType.charAt(0).toUpperCase();
    if (confirmedSeatIds.has(seat.id)) return 'X';
    const hold = getHoldForSeat(seat.id);
    if (hold) return 'H';
    if ($preferences.showScores) return String(seat.score);
    return String(seat.number);
  }

  function seatTitle(seat: SeatMapEntry): string {
    const parts = [seat.label, SEAT_TYPE_LABELS[seat.seatType]];
    if (!seat.selectable) {
      parts.push('(non-selectable)');
    } else {
      if (confirmedSeatIds.has(seat.id)) {
        parts.push('CONFIRMED');
      } else {
        const hold = getHoldForSeat(seat.id);
        if (hold) {
          const remaining = Math.max(0, Math.ceil((hold.expiresAt - Date.now()) / 1000));
          parts.push(`HELD (${Math.floor(remaining / 60)}m ${remaining % 60}s left)`);
        } else {
          parts.push('Available');
        }
      }
      parts.push(`Score: ${seat.score}`);
    }
    return parts.join(' — ');
  }

  function isClickable(seat: SeatMapEntry): boolean {
    if (editMode) return true;
    return seat.selectable && !confirmedSeatIds.has(seat.id);
  }
</script>

<div class="grid-container">
  <div class="stage">FRONT</div>
  <div class="grid">
    {#each Array.from({ length: rows }, (_, i) => i + 1) as row}
      <div class="row">
        <span class="row-label">R{row}</span>
        {#each Array.from({ length: seatsPerRow }, (_, i) => i + 1) as num}
          {@const seat = getSeat(row, num)}
          {#if seat}
            <button
              class="seat"
              class:non-selectable={!seat.selectable}
              class:clickable={isClickable(seat)}
              style="background-color: {seatColor(seat)}"
              title={seatTitle(seat)}
              onclick={() => isClickable(seat) && onSeatClick(seat)}
              disabled={!isClickable(seat)}
            >
              {seatLabel(seat)}
            </button>
          {:else}
            <span class="seat empty"></span>
          {/if}
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .grid-container {
    padding: 1rem;
    overflow-x: auto;
  }
  .stage {
    text-align: center;
    padding: 0.5rem;
    margin-bottom: 1rem;
    background: #44475a;
    color: #8be9fd;
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.15em;
    border-radius: 6px 6px 0 0;
  }
  .grid {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .row {
    display: flex;
    gap: 3px;
    align-items: center;
  }
  .row-label {
    width: 2.5rem;
    font-weight: 600;
    font-size: 0.75rem;
    color: #888;
    text-align: right;
    padding-right: 0.3rem;
  }
  .seat {
    width: 2.2rem;
    height: 2.2rem;
    border: none;
    border-radius: 5px;
    font-size: 0.65rem;
    font-weight: 700;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.1s, opacity 0.1s;
    padding: 0;
  }
  .seat.clickable {
    cursor: pointer;
  }
  .seat.clickable:hover {
    transform: scale(1.18);
    z-index: 2;
  }
  .seat.non-selectable {
    cursor: not-allowed;
    opacity: 0.7;
    border: 1px dashed rgba(255, 255, 255, 0.3);
  }
  .seat:disabled:not(.non-selectable) {
    cursor: default;
    opacity: 0.5;
  }
  .seat.empty {
    visibility: hidden;
  }
</style>

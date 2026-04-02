<script lang="ts">
  import ModalShell from './ModalShell.svelte';
  import StatusBadge from '../components/StatusBadge.svelte';
  import { changeSeatStatus, selectedSeat } from '../stores/seat-store';
  import { closeModal } from '../stores/modal-store';
  import { canTransition } from '@domain/policies';
  import type { SeatStatus } from '@domain/models/seat';
  import { currentUserId, currentRole } from '../stores/auth-store';
  import type { UserRole } from '@domain/models/user';

  function getActor() { return { userId: $currentUserId ?? '', role: ($currentRole ?? 'dispatcher') as UserRole }; }

  const ALL_STATUSES: SeatStatus[] = ['available', 'reserved', 'occupied', 'blocked'];

  let seat = $derived($selectedSeat);

  function availableTransitions(current: SeatStatus): SeatStatus[] {
    return ALL_STATUSES.filter((s) => s !== current && canTransition(current, s));
  }

  async function handleTransition(status: SeatStatus) {
    if (!seat) return;
    await changeSeatStatus(seat.id, status, seat.venueId, getActor());
    closeModal();
  }
</script>

<ModalShell title="Seat Details">
  {#if seat}
    <div class="details">
      <p><strong>ID:</strong> {seat.id}</p>
      <p><strong>Label:</strong> {seat.label}</p>
      <p><strong>Status:</strong> <StatusBadge status={seat.status} /></p>
      <p><strong>Score:</strong> {seat.score}/100</p>
    </div>
    <div class="actions">
      {#each availableTransitions(seat.status) as target}
        <button class="action-btn {target}" onclick={() => handleTransition(target)}>
          Mark {target}
        </button>
      {/each}
      <button class="close-btn" onclick={closeModal}>Close</button>
    </div>
  {/if}
</ModalShell>

<style>
  .details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .details p {
    margin: 0;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .action-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    color: #fff;
  }
  .action-btn.available {
    background: #50fa7b;
    color: #282a36;
  }
  .action-btn.reserved {
    background: #ffb86c;
    color: #282a36;
  }
  .action-btn.occupied {
    background: #ff5555;
  }
  .action-btn.blocked {
    background: #44475a;
  }
  .close-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #44475a;
    border-radius: 6px;
    cursor: pointer;
    background: none;
    color: #f8f8f2;
  }
</style>

<script lang="ts">
  import { modal } from '../stores/modal-store';
  import CreateVenueModal from './CreateVenueModal.svelte';
  import CreateTripModal from './CreateTripModal.svelte';
  import SeatDetailModal from './SeatDetailModal.svelte';
  import ConfirmModal from './ConfirmModal.svelte';
</script>

{#if $modal.type === 'createVenue'}
  <CreateVenueModal />
{:else if $modal.type === 'createTrip'}
  <CreateTripModal />
{:else if $modal.type === 'seatDetail'}
  <SeatDetailModal />
{:else if $modal.type === 'confirm'}
  <ConfirmModal />
{/if}

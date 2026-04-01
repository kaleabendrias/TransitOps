<script lang="ts">
  import type { SeatStatus } from '@domain/models/seat';

  interface Props {
    status: SeatStatus;
  }

  let { status }: Props = $props();

  const colors: Record<SeatStatus, string> = {
    available: '#50fa7b',
    reserved: '#ffb86c',
    occupied: '#ff5555',
    blocked: '#44475a',
  };
</script>

<span class="badge" style="background-color: {colors[status]}">{status}</span>

<style>
  .badge {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #fff;
    text-transform: uppercase;
  }
</style>

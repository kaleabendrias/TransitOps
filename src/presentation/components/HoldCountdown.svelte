<script lang="ts">
  import type { Hold } from '@domain/models/hold';
  import { remainingMs } from '@domain/models/hold';
  import { onMount } from 'svelte';

  interface Props {
    hold: Hold;
    onExpired?: () => void;
  }

  let { hold, onExpired }: Props = $props();

  let remaining = $derived.by(() => {
    // Re-derive when hold prop changes; tick drives updates via _tick
    return remainingMs(hold) - _tick + _tick;
  });
  let _tick = $state(0);
  let interval: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    interval = setInterval(() => {
      _tick = Date.now();
      if (remainingMs(hold) <= 0) {
        if (interval) clearInterval(interval);
        onExpired?.();
      }
    }, 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  });

  let minutes = $derived(Math.floor(remaining / 60000));
  let seconds = $derived(Math.floor((remaining % 60000) / 1000));
  let isWarning = $derived(remaining < 60000 && remaining > 0);
  let isExpired = $derived(remaining <= 0);
</script>

<span
  class="countdown"
  class:warning={isWarning}
  class:expired={isExpired}
>
  {#if isExpired}
    Expired
  {:else}
    {minutes}:{seconds.toString().padStart(2, '0')}
  {/if}
</span>

<style>
  .countdown {
    font-family: 'Courier New', monospace;
    font-weight: 700;
    font-size: 1.1rem;
    color: #50fa7b;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    background: rgba(80, 250, 123, 0.1);
  }
  .warning {
    color: #ffb86c;
    background: rgba(255, 184, 108, 0.15);
    animation: pulse 1s infinite;
  }
  .expired {
    color: #ff5555;
    background: rgba(255, 85, 85, 0.15);
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>

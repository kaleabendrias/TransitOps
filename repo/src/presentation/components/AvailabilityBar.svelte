<script lang="ts">
  interface Props {
    total: number;
    available: number;
    held: number;
    confirmed: number;
    nonSelectable: number;
  }

  let { total, available, held, confirmed, nonSelectable }: Props = $props();

  function pct(n: number): string {
    if (total === 0) return '0%';
    return `${((n / total) * 100).toFixed(1)}%`;
  }
</script>

<div class="bar-container">
  <div class="bar">
    {#if available > 0}
      <div class="segment available" style="width: {pct(available)}" title="Available: {available}"></div>
    {/if}
    {#if held > 0}
      <div class="segment held" style="width: {pct(held)}" title="Held: {held}"></div>
    {/if}
    {#if confirmed > 0}
      <div class="segment confirmed" style="width: {pct(confirmed)}" title="Confirmed: {confirmed}"></div>
    {/if}
    {#if nonSelectable > 0}
      <div class="segment non-selectable" style="width: {pct(nonSelectable)}" title="Non-selectable: {nonSelectable}"></div>
    {/if}
  </div>
  <div class="legend">
    <span><span class="dot available"></span> Available {available}</span>
    <span><span class="dot held"></span> Held {held}</span>
    <span><span class="dot confirmed"></span> Confirmed {confirmed}</span>
    <span><span class="dot non-selectable"></span> Blocked {nonSelectable}</span>
  </div>
</div>

<style>
  .bar-container {
    margin-bottom: 1rem;
  }
  .bar {
    display: flex;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    background: #44475a;
    margin-bottom: 0.5rem;
  }
  .segment {
    transition: width 0.3s ease;
  }
  .segment.available { background: #50fa7b; }
  .segment.held { background: #ffb86c; }
  .segment.confirmed { background: #ff5555; }
  .segment.non-selectable { background: #6272a4; }
  .legend {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.75rem;
    color: #aaa;
  }
  .legend span {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }
  .dot.available { background: #50fa7b; }
  .dot.held { background: #ffb86c; }
  .dot.confirmed { background: #ff5555; }
  .dot.non-selectable { background: #6272a4; }
</style>

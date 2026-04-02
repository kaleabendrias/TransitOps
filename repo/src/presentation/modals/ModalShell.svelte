<script lang="ts">
  import { closeModal } from '../stores/modal-store';
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    children: Snippet;
  }

  let { title, children }: Props = $props();

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) closeModal();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeModal();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="backdrop" role="presentation" onclick={handleBackdrop} onkeydown={handleKeydown}>
  <div class="modal" role="dialog" aria-modal="true" aria-label={title}>
    <div class="modal-header">
      <h2>{title}</h2>
      <button class="close" onclick={closeModal} aria-label="Close">&times;</button>
    </div>
    <div class="modal-body">
      {@render children()}
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .modal {
    background: #282a36;
    color: #f8f8f2;
    border-radius: 12px;
    min-width: 400px;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #44475a;
  }
  .modal-header h2 {
    margin: 0;
    font-size: 1.2rem;
  }
  .close {
    background: none;
    border: none;
    color: #f8f8f2;
    font-size: 1.5rem;
    cursor: pointer;
  }
  .modal-body {
    padding: 1.5rem;
  }
</style>

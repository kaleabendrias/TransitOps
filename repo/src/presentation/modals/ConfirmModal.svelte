<script lang="ts">
  import ModalShell from './ModalShell.svelte';
  import { modal, closeModal } from '../stores/modal-store';

  let message = $derived(($modal.props.message as string) ?? 'Are you sure?');
  let onConfirm = $derived(($modal.props.onConfirm as (() => void)) ?? closeModal);

  function handleConfirm() {
    onConfirm();
    closeModal();
  }
</script>

<ModalShell title="Confirm">
  <p>{message}</p>
  <div class="actions">
    <button class="cancel" onclick={closeModal}>Cancel</button>
    <button class="confirm" onclick={handleConfirm}>Confirm</button>
  </div>
</ModalShell>

<style>
  p {
    margin: 0 0 1rem;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  button {
    padding: 0.5rem 1.2rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
  }
  .cancel {
    background: #44475a;
    color: #f8f8f2;
  }
  .confirm {
    background: #ff5555;
    color: #fff;
  }
</style>

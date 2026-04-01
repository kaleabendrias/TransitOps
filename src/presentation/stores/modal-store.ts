import { writable } from 'svelte/store';

export type ModalType = 'createVenue' | 'createTrip' | 'seatDetail' | 'settings' | 'confirm' | null;

export interface ModalState {
  type: ModalType;
  props: Record<string, unknown>;
}

export const modal = writable<ModalState>({ type: null, props: {} });

export function openModal(type: NonNullable<ModalType>, props: Record<string, unknown> = {}) {
  modal.set({ type, props });
}

export function closeModal() {
  modal.set({ type: null, props: {} });
}

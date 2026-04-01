import { writable } from 'svelte/store';
import type { Seat, SeatStatus } from '@domain/models/seat';
import { seatService } from '@services/container';
import type { ServiceActor } from '@services/service-actor';

export const seats = writable<Seat[]>([]);
export const seatLoading = writable(false);
export const seatError = writable<string | null>(null);
export const selectedSeat = writable<Seat | null>(null);

export async function loadSeats(venueId: string) {
  seatLoading.set(true);
  seatError.set(null);
  try { seats.set(await seatService.getSeatsForVenue(venueId)); }
  catch (e) { seatError.set(e instanceof Error ? e.message : 'Failed to load seats'); }
  finally { seatLoading.set(false); }
}

export async function changeSeatStatus(seatId: string, status: SeatStatus, venueId: string, actor: ServiceActor) {
  seatError.set(null);
  try {
    const updated = await seatService.changeSeatStatus(seatId, status, actor);
    selectedSeat.set(updated);
    await loadSeats(venueId);
  } catch (e) { seatError.set(e instanceof Error ? e.message : 'Failed to update seat'); }
}

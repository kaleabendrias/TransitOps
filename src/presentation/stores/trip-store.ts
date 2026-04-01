import { writable } from 'svelte/store';
import type { Trip } from '@domain/models/trip';
import { tripService } from '@services/container';
import type { ServiceActor } from '@services/service-actor';

export const trips = writable<Trip[]>([]);
export const tripLoading = writable(false);
export const tripError = writable<string | null>(null);

export async function loadTrips() {
  tripLoading.set(true);
  tripError.set(null);
  try { trips.set(await tripService.listTrips()); }
  catch (e) { tripError.set(e instanceof Error ? e.message : 'Failed to load trips'); }
  finally { tripLoading.set(false); }
}

export async function addTrip(venueId: string, name: string, departureTime: number, createdBy: string, actor: ServiceActor, description?: string) {
  tripLoading.set(true);
  tripError.set(null);
  try { await tripService.createTrip(venueId, name, departureTime, createdBy, actor, description); await loadTrips(); }
  catch (e) { tripError.set(e instanceof Error ? e.message : 'Failed to create trip'); throw e; }
  finally { tripLoading.set(false); }
}

export async function removeTrip(id: string, actor: ServiceActor) {
  tripLoading.set(true);
  tripError.set(null);
  try { await tripService.deleteTrip(id, actor); await loadTrips(); }
  catch (e) { tripError.set(e instanceof Error ? e.message : 'Failed to delete trip'); }
  finally { tripLoading.set(false); }
}

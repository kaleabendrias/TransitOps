import { writable } from 'svelte/store';
import type { Venue } from '@domain/models/venue';
import { venueService } from '@services/container';
import type { ServiceActor } from '@services/service-actor';

export const venues = writable<Venue[]>([]);
export const loading = writable(false);
export const error = writable<string | null>(null);

export async function loadVenues() {
  loading.set(true);
  error.set(null);
  try { venues.set(await venueService.listVenues()); }
  catch (e) { error.set(e instanceof Error ? e.message : 'Failed to load venues'); }
  finally { loading.set(false); }
}

export async function addVenue(name: string, rows: number, seatsPerRow: number, actor: ServiceActor) {
  loading.set(true);
  error.set(null);
  try { await venueService.createVenue(name, rows, seatsPerRow, actor); await loadVenues(); }
  catch (e) { error.set(e instanceof Error ? e.message : 'Failed to create venue'); throw e; }
  finally { loading.set(false); }
}

export async function removeVenue(id: string, actor: ServiceActor) {
  loading.set(true);
  error.set(null);
  try { await venueService.deleteVenue(id, actor); await loadVenues(); }
  catch (e) { error.set(e instanceof Error ? e.message : 'Failed to delete venue'); }
  finally { loading.set(false); }
}

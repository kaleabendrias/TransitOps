import type { Trip, TripStatus } from '@domain/models/trip';
import { createTrip, updateTripStatus } from '@domain/models/trip';
import type { TripRepository } from '@domain/ports/trip-repository';
import type { ServiceActor } from './service-actor';
import { requirePermission } from './service-actor';

export class TripService {
  constructor(private readonly tripRepo: TripRepository) {}

  async listTrips(): Promise<Trip[]> {
    return this.tripRepo.getAll();
  }

  async getTrip(id: string): Promise<Trip | null> {
    return this.tripRepo.getById(id);
  }

  async getTripsByVenue(venueId: string): Promise<Trip[]> {
    return this.tripRepo.getByVenue(venueId);
  }

  async createTrip(venueId: string, name: string, departureTime: number, createdBy: string, actor: ServiceActor, description?: string): Promise<Trip> {
    requirePermission(actor, 'manage_trips');
    const trip = createTrip({ venueId, name, description, departureTime, createdBy });
    await this.tripRepo.save(trip);
    return trip;
  }

  async updateStatus(tripId: string, status: TripStatus, actor: ServiceActor): Promise<Trip> {
    requirePermission(actor, 'manage_trips');
    const trip = await this.tripRepo.getById(tripId);
    if (!trip) throw new Error(`Trip ${tripId} not found`);
    const updated = updateTripStatus(trip, status);
    await this.tripRepo.save(updated);
    return updated;
  }

  async deleteTrip(id: string, actor: ServiceActor): Promise<void> {
    requirePermission(actor, 'manage_trips');
    await this.tripRepo.delete(id);
  }
}

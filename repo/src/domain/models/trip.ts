export type TripStatus = 'draft' | 'published' | 'boarding' | 'departed' | 'completed' | 'cancelled';

export interface Trip {
  readonly id: string;
  readonly venueId: string;
  readonly name: string;
  readonly description: string;
  readonly departureTime: number;
  readonly status: TripStatus;
  readonly createdBy: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export function createTrip(params: {
  venueId: string;
  name: string;
  description?: string;
  departureTime: number;
  createdBy: string;
}): Trip {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    venueId: params.venueId,
    name: params.name,
    description: params.description ?? '',
    departureTime: params.departureTime,
    status: 'draft',
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateTripStatus(trip: Trip, status: TripStatus): Trip {
  return { ...trip, status, updatedAt: Date.now() };
}

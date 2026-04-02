import type { Seat, SeatStatus } from '../models/seat';

const VALID_TRANSITIONS: Record<SeatStatus, SeatStatus[]> = {
  available: ['reserved', 'blocked'],
  reserved: ['available', 'occupied'],
  occupied: ['available'],
  blocked: ['available'],
};

export function canTransition(from: SeatStatus, to: SeatStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateSeatTransition(seat: Seat, targetStatus: SeatStatus): string | null {
  if (seat.status === targetStatus) {
    return `Seat is already ${targetStatus}`;
  }
  if (!canTransition(seat.status, targetStatus)) {
    return `Cannot transition from ${seat.status} to ${targetStatus}`;
  }
  return null;
}

export function canReserveSeat(seat: Seat): boolean {
  return seat.status === 'available';
}

export function canReleaseSeat(seat: Seat): boolean {
  return seat.status === 'reserved' || seat.status === 'occupied';
}

export function validateVenueCapacity(
  currentSeatCount: number,
  maxCapacity: number
): string | null {
  if (currentSeatCount >= maxCapacity) {
    return `Venue capacity of ${maxCapacity} seats exceeded`;
  }
  return null;
}

export function validateRowAndSeat(
  row: number,
  seatNumber: number,
  maxRows: number,
  maxSeatsPerRow: number
): string | null {
  if (row < 1 || row > maxRows) {
    return `Row must be between 1 and ${maxRows}`;
  }
  if (seatNumber < 1 || seatNumber > maxSeatsPerRow) {
    return `Seat number must be between 1 and ${maxSeatsPerRow}`;
  }
  return null;
}

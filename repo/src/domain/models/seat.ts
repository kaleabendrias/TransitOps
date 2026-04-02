export type SeatStatus = 'available' | 'reserved' | 'occupied' | 'blocked';

export interface Seat {
  readonly id: string;
  readonly venueId: string;
  readonly row: number;
  readonly number: number;
  readonly label: string;
  readonly status: SeatStatus;
  readonly score: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export function createSeat(params: {
  venueId: string;
  row: number;
  number: number;
  score?: number;
}): Seat {
  const now = Date.now();
  return {
    id: `${params.venueId}-R${params.row}-S${params.number}`,
    venueId: params.venueId,
    row: params.row,
    number: params.number,
    label: `Row ${params.row}, Seat ${params.number}`,
    status: 'available',
    score: params.score ?? 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateSeatStatus(seat: Seat, status: SeatStatus): Seat {
  return { ...seat, status, updatedAt: Date.now() };
}

export function updateSeatScore(seat: Seat, score: number): Seat {
  return { ...seat, score, updatedAt: Date.now() };
}

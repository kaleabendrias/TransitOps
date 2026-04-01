export type SeatType = 'standard' | 'ada' | 'crew' | 'premium';

export interface SeatMapEntry {
  readonly id: string;
  readonly tripId: string;
  readonly row: number;
  readonly number: number;
  readonly label: string;
  readonly seatType: SeatType;
  readonly selectable: boolean;
  readonly score: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export function createSeatMapEntry(params: {
  tripId: string;
  row: number;
  number: number;
  seatType?: SeatType;
}): SeatMapEntry {
  const seatType = params.seatType ?? 'standard';
  const selectable = seatType === 'standard' || seatType === 'premium';
  const now = Date.now();
  return {
    id: `${params.tripId}-R${params.row}-S${params.number}`,
    tripId: params.tripId,
    row: params.row,
    number: params.number,
    label: `Row ${params.row}, Seat ${params.number}`,
    seatType,
    selectable,
    score: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateSeatType(entry: SeatMapEntry, seatType: SeatType): SeatMapEntry {
  const selectable = seatType === 'standard' || seatType === 'premium';
  return { ...entry, seatType, selectable, updatedAt: Date.now() };
}

export function isSeatSelectable(entry: SeatMapEntry): boolean {
  return entry.selectable;
}

export const SEAT_TYPE_LABELS: Record<SeatType, string> = {
  standard: 'Standard',
  ada: 'ADA / Accessible',
  crew: 'Crew Only',
  premium: 'Premium',
};

export const ALL_SEAT_TYPES: SeatType[] = ['standard', 'ada', 'crew', 'premium'];

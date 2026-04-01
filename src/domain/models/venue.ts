export interface Venue {
  readonly id: string;
  readonly name: string;
  readonly rows: number;
  readonly seatsPerRow: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export function createVenue(params: {
  name: string;
  rows: number;
  seatsPerRow: number;
}): Venue {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: params.name,
    rows: params.rows,
    seatsPerRow: params.seatsPerRow,
    createdAt: now,
    updatedAt: now,
  };
}

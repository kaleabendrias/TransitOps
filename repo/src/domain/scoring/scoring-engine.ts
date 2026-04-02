import type { Seat } from '../models/seat';

export interface ScoringCriteria {
  readonly rowWeight: number;
  readonly centerWeight: number;
  readonly proximityWeight: number;
}

const DEFAULT_CRITERIA: ScoringCriteria = {
  rowWeight: 0.4,
  centerWeight: 0.4,
  proximityWeight: 0.2,
};

export function calculateSeatScore(
  seat: Seat,
  totalRows: number,
  seatsPerRow: number,
  criteria: ScoringCriteria = DEFAULT_CRITERIA
): number {
  const rowScore = calculateRowScore(seat.row, totalRows);
  const centerScore = calculateCenterScore(seat.number, seatsPerRow);
  const proximityScore = calculateProximityScore(seat.row, seat.number, totalRows, seatsPerRow);

  const raw =
    rowScore * criteria.rowWeight +
    centerScore * criteria.centerWeight +
    proximityScore * criteria.proximityWeight;

  return clampScore(Math.round(raw * 100));
}

function calculateRowScore(row: number, totalRows: number): number {
  if (totalRows <= 1) return 1;
  const idealRow = Math.ceil(totalRows * 0.3);
  const distance = Math.abs(row - idealRow);
  return Math.max(0, 1 - distance / totalRows);
}

function calculateCenterScore(seatNumber: number, seatsPerRow: number): number {
  if (seatsPerRow <= 1) return 1;
  const center = (seatsPerRow + 1) / 2;
  const distance = Math.abs(seatNumber - center);
  const maxDistance = (seatsPerRow - 1) / 2;
  return Math.max(0, 1 - distance / maxDistance);
}

function calculateProximityScore(
  row: number,
  seatNumber: number,
  totalRows: number,
  seatsPerRow: number
): number {
  const rowNorm = totalRows > 1 ? (row - 1) / (totalRows - 1) : 0;
  const seatNorm = seatsPerRow > 1 ? (seatNumber - 1) / (seatsPerRow - 1) : 0;
  const centerDist = Math.sqrt((rowNorm - 0.3) ** 2 + (seatNorm - 0.5) ** 2);
  return Math.max(0, 1 - centerDist);
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

export function isPassingScore(score: number, threshold: number): boolean {
  return score >= threshold;
}

import type { QuietHours } from '../ports/preferences-repository';

export function isInQuietHours(quietHours: QuietHours, now: Date = new Date()): boolean {
  if (!quietHours.enabled) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = quietHours.start.split(':').map(Number);
  const [endH, endM] = quietHours.end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Wraps midnight (e.g., 21:00 - 07:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export function getQuietHoursLabel(quietHours: QuietHours): string {
  if (!quietHours.enabled) return 'Disabled';
  return `${quietHours.start} – ${quietHours.end}`;
}

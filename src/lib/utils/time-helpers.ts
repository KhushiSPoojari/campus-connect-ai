/**
 * Validates whether a string is in 24-hour "HH:MM" format.
 */
export function isValidTimeString(timeStr: string): boolean {
  if (typeof timeStr !== 'string') return false;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr.trim());
  return match;
}

/**
 * Converts a 24-hour time string ("HH:MM") to total minutes from midnight.
 * Returns -1 if invalid.
 */
export function timeToMinutes(timeStr: string): number {
  if (!isValidTimeString(timeStr)) return -1;
  const [hours, minutes] = timeStr.trim().split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts total minutes from midnight back to "HH:MM" string format.
 */
export function minutesToTime(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes < 0) return '00:00';
  const clamped = Math.min(Math.max(totalMinutes, 0), 24 * 60 - 1);
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Checks if a given time is within [start, end) interval (inclusive start, exclusive end).
 */
export function isTimeInRange(targetTime: string, startTime: string, endTime: string): boolean {
  const target = timeToMinutes(targetTime);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (target === -1 || start === -1 || end === -1) return false;
  return target >= start && target < end;
}

/**
 * Normalizes day string to standard capitalized weekday name.
 */
export function normalizeDayOfWeek(day: string): string {
  if (!day || typeof day !== 'string') return 'Monday';
  const clean = day.trim().toLowerCase();
  const map: Record<string, string> = {
    monday: 'Monday',
    mon: 'Monday',
    tuesday: 'Tuesday',
    tue: 'Tuesday',
    wednesday: 'Wednesday',
    wed: 'Wednesday',
    thursday: 'Thursday',
    thu: 'Thursday',
    friday: 'Friday',
    fri: 'Friday',
    saturday: 'Saturday',
    sat: 'Saturday',
    sunday: 'Sunday',
    sun: 'Sunday',
  };
  return map[clean] || 'Monday';
}

import { describe, it, expect } from 'vitest';
import {
  timeToMinutes,
  minutesToTime,
  isValidTimeString,
  isTimeInRange,
  normalizeDayOfWeek,
} from '@/lib/utils/time-helpers';

describe('Time and Schedule Helper Utilities', () => {
  it('correctly converts 24h time strings to minutes and back', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('14:45')).toBe(885);
    expect(timeToMinutes('23:59')).toBe(1439);

    expect(minutesToTime(0)).toBe('00:00');
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(885)).toBe('14:45');
  });

  it('validates 24-hour time strings strictly', () => {
    expect(isValidTimeString('09:00')).toBe(true);
    expect(isValidTimeString('23:59')).toBe(true);
    expect(isValidTimeString('24:00')).toBe(false);
    expect(isValidTimeString('12:60')).toBe(false);
    expect(isValidTimeString('invalid')).toBe(false);
    // @ts-expect-error test non-string
    expect(isValidTimeString(null)).toBe(false);
  });

  it('checks if a time falls within half-open intervals [start, end)', () => {
    // Range 09:00 to 10:30
    expect(isTimeInRange('09:00', '09:00', '10:30')).toBe(true); // Inclusive start
    expect(isTimeInRange('09:45', '09:00', '10:30')).toBe(true);
    expect(isTimeInRange('10:30', '09:00', '10:30')).toBe(false); // Exclusive end
    expect(isTimeInRange('08:59', '09:00', '10:30')).toBe(false);
    expect(isTimeInRange('11:00', '09:00', '10:30')).toBe(false);
  });

  it('normalizes various day string formats reliably', () => {
    expect(normalizeDayOfWeek('mon')).toBe('Monday');
    expect(normalizeDayOfWeek('Monday')).toBe('Monday');
    expect(normalizeDayOfWeek('WEDNESDAY')).toBe('Wednesday');
    expect(normalizeDayOfWeek('fri')).toBe('Friday');
    expect(normalizeDayOfWeek('sun')).toBe('Sunday');
    // @ts-expect-error test empty
    expect(normalizeDayOfWeek(undefined)).toBe('Monday');
  });
});

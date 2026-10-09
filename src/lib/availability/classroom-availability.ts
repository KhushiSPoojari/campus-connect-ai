import type { Classroom, ClassroomAvailability, ClassroomSlot } from '@/types/classroom';
import { isTimeInRange, isValidTimeString, normalizeDayOfWeek, timeToMinutes } from '../utils/time-helpers';

const CAMPUS_DAY_END = '18:00';

/**
 * Calculates classroom occupancy status for a given day and time.
 * Correctly computes current lecture occupant, next scheduled event, and remaining free duration.
 */
export function getClassroomAvailability(
  classroom: Classroom | null | undefined,
  day: string,
  timeStr: string
): ClassroomAvailability {
  // Safe default for null/undefined classroom
  if (!classroom || typeof classroom !== 'object') {
    return {
      isOccupied: false,
      statusLabel: 'Vacant',
      todaySchedule: [],
    };
  }

  const normalizedDay = normalizeDayOfWeek(day);
  const daySchedule: ClassroomSlot[] = (classroom.weeklySchedule && Array.isArray(classroom.weeklySchedule[normalizedDay]))
    ? [...classroom.weeklySchedule[normalizedDay]].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    : [];

  if (!isValidTimeString(timeStr)) {
    return {
      isOccupied: false,
      statusLabel: 'Vacant',
      todaySchedule: daySchedule,
    };
  }

  const currentMinutes = timeToMinutes(timeStr);

  // Check if room is currently occupied by a lecture/lab
  const activeSlot = daySchedule.find(slot =>
    isValidTimeString(slot.startTime) &&
    isValidTimeString(slot.endTime) &&
    isTimeInRange(timeStr, slot.startTime, slot.endTime)
  );

  if (activeSlot) {
    // Room is currently occupied
    return {
      isOccupied: true,
      statusLabel: 'Occupied',
      currentOccupant: activeSlot,
      nextOccupiedTime: undefined,
      freeUntil: undefined,
      freeForHours: 0,
      todaySchedule: daySchedule,
    };
  }

  // Room is vacant at this moment. Find the next upcoming lecture/class today.
  const futureSlots = daySchedule.filter(slot =>
    isValidTimeString(slot.startTime) && timeToMinutes(slot.startTime) > currentMinutes
  );

  if (futureSlots.length > 0) {
    const nextSlot = futureSlots[0];
    const freeUntil = nextSlot.startTime;
    const diffMinutes = Math.max(timeToMinutes(freeUntil) - currentMinutes, 0);
    const freeForHours = Math.round((diffMinutes / 60) * 10) / 10;

    return {
      isOccupied: false,
      statusLabel: 'Vacant',
      nextOccupiedTime: nextSlot.startTime,
      freeUntil,
      freeForHours,
      todaySchedule: daySchedule,
    };
  }

  // Room is vacant for the remainder of the campus day
  const dayEndMinutes = timeToMinutes(CAMPUS_DAY_END);
  const remainingMinutes = Math.max(dayEndMinutes - currentMinutes, 0);
  const freeForHours = Math.round((remainingMinutes / 60) * 10) / 10;

  return {
    isOccupied: false,
    statusLabel: 'Vacant',
    freeUntil: CAMPUS_DAY_END,
    freeForHours,
    todaySchedule: daySchedule,
  };
}

import type { FacultyMember, FacultyAvailability, FacultyTimeSlot } from '@/types/faculty';
import { isTimeInRange, isValidTimeString, normalizeDayOfWeek, timeToMinutes } from '../utils/time-helpers';

/**
 * Standard campus working hours (08:30 to 17:30).
 */
const CAMPUS_HOURS_START = '08:30';
const CAMPUS_HOURS_END = '17:30';

/**
 * Evaluates real-time or simulated availability of a faculty member given a specific day and time.
 * Handles missing/invalid timetable data gracefully without throwing.
 */
export function getFacultyAvailability(
  faculty: FacultyMember | null | undefined,
  day: string,
  timeStr: string
): FacultyAvailability {
  // Safe fallback if faculty object is missing
  if (!faculty || typeof faculty !== 'object') {
    return {
      state: 'Off-duty',
      currentLocation: 'Unknown',
      currentActivity: 'Faculty profile unavailable',
    };
  }

  const officeLocation = faculty.office
    ? `${faculty.office.roomNumber} (${faculty.office.building}, ${faculty.office.floor})`
    : 'Faculty Cabin';

  // Validate time format; if invalid, default to off-duty
  if (!isValidTimeString(timeStr)) {
    return {
      state: 'Off-duty',
      currentLocation: officeLocation,
      currentActivity: 'Invalid time input provided',
    };
  }

  const normalizedDay = normalizeDayOfWeek(day);
  const currentMinutes = timeToMinutes(timeStr);
  const startMinutes = timeToMinutes(CAMPUS_HOURS_START);
  const endMinutes = timeToMinutes(CAMPUS_HOURS_END);

  // Weekend or outside working hours -> Off-duty
  if (normalizedDay === 'Sunday' || currentMinutes < startMinutes || currentMinutes >= endMinutes) {
    return {
      state: 'Off-duty',
      currentLocation: 'Off-Campus',
      currentActivity: 'Outside scheduled campus hours',
    };
  }

  // Safely check schedule for the day
  const daySchedule: FacultyTimeSlot[] = (faculty.weeklySchedule && Array.isArray(faculty.weeklySchedule[normalizedDay]))
    ? faculty.weeklySchedule[normalizedDay]
    : [];

  // Find active slot for this time
  const activeSlot = daySchedule.find(slot =>
    isValidTimeString(slot.startTime) &&
    isValidTimeString(slot.endTime) &&
    isTimeInRange(timeStr, slot.startTime, slot.endTime)
  );

  if (activeSlot) {
    if (activeSlot.activity === 'Class' || activeSlot.activity === 'Lab') {
      const subjectInfo = activeSlot.subjectName
        ? `${activeSlot.subjectName} (${activeSlot.subjectCode || 'Class'})`
        : activeSlot.subjectCode || 'Lecture';

      return {
        state: 'In Class',
        currentLocation: activeSlot.location || 'Lecture Hall',
        currentActivity: `Delivering: ${subjectInfo}`,
        nextFreeTime: activeSlot.endTime,
        activeSlot,
      };
    }

    if (activeSlot.activity === 'OfficeHours') {
      return {
        state: 'In Office',
        currentLocation: activeSlot.location || officeLocation,
        currentActivity: 'Official Office Hours (Student Consultations)',
        nextFreeTime: activeSlot.endTime,
        activeSlot,
      };
    }

    if (activeSlot.activity === 'Meeting') {
      return {
        state: 'In Office',
        currentLocation: activeSlot.location || officeLocation,
        currentActivity: 'In Department / Committee Meeting',
        nextFreeTime: activeSlot.endTime,
        activeSlot,
      };
    }

    if (activeSlot.activity === 'Free') {
      return {
        state: 'Available',
        currentLocation: officeLocation,
        currentActivity: 'Available in Cabin',
        nextFreeTime: activeSlot.endTime,
        activeSlot,
      };
    }
  }

  // If no conflicting lecture/meeting is found during working hours,
  // find the next upcoming scheduled slot for the rest of today
  const upcomingSlots = daySchedule
    .filter(slot => timeToMinutes(slot.startTime) > currentMinutes)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const nextSlot = upcomingSlots[0];

  return {
    state: 'Available',
    currentLocation: officeLocation,
    currentActivity: 'Available in Cabin',
    nextFreeTime: nextSlot ? nextSlot.startTime : undefined,
  };
}

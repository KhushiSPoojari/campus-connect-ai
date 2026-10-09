import { describe, it, expect } from 'vitest';
import { getClassroomAvailability } from '@/lib/availability/classroom-availability';
import { CLASSROOM_DATA } from '@/data';

describe('Classroom Availability Engine', () => {
  const roomLH101 = CLASSROOM_DATA.find(r => r.roomNumber === 'LH-101')!;
  const roomTR102 = CLASSROOM_DATA.find(r => r.roomNumber === 'TR-102')!; // empty schedule

  it('detects when a classroom is occupied by an ongoing class', () => {
    // LH-101 has CS301 on Monday from 09:00 to 10:30
    const availability = getClassroomAvailability(roomLH101, 'Monday', '09:30');
    expect(availability.isOccupied).toBe(true);
    expect(availability.statusLabel).toBe('Occupied');
    expect(availability.currentOccupant?.subjectCode).toBe('CS301');
    expect(availability.currentOccupant?.facultyName).toBe('Dr. Sarah Mitchell');
    expect(availability.freeForHours).toBe(0);
  });

  it('detects when a classroom is vacant between classes and calculates next occupied time', () => {
    // LH-101 is free on Monday from 10:30 to 11:00 (next class at 11:00)
    const availability = getClassroomAvailability(roomLH101, 'Monday', '10:30');
    expect(availability.isOccupied).toBe(false);
    expect(availability.statusLabel).toBe('Vacant');
    expect(availability.nextOccupiedTime).toBe('11:00');
    expect(availability.freeUntil).toBe('11:00');
    expect(availability.freeForHours).toBe(0.5); // 30 minutes free
  });

  it('calculates remaining free hours until end of day when no further classes exist', () => {
    // LH-101 has last class ending at 15:30 on Monday. Query at 16:00.
    const availability = getClassroomAvailability(roomLH101, 'Monday', '16:00');
    expect(availability.isOccupied).toBe(false);
    expect(availability.statusLabel).toBe('Vacant');
    expect(availability.freeUntil).toBe('18:00');
    expect(availability.freeForHours).toBe(2); // 2 hours until 18:00
  });

  it('safely handles classrooms with empty or unallocated weekly schedules', () => {
    // TR-102 has empty schedule
    const availability = getClassroomAvailability(roomTR102, 'Monday', '11:00');
    expect(availability.isOccupied).toBe(false);
    expect(availability.statusLabel).toBe('Vacant');
    expect(availability.todaySchedule).toEqual([]);
    expect(availability.freeForHours).toBeGreaterThan(0);
  });

  it('safely handles null, undefined, and invalid inputs', () => {
    const nullAvailability = getClassroomAvailability(null, 'Monday', '10:00');
    expect(nullAvailability.isOccupied).toBe(false);
    expect(nullAvailability.statusLabel).toBe('Vacant');

    const invalidTimeAvailability = getClassroomAvailability(roomLH101, 'Monday', '27:99');
    expect(invalidTimeAvailability.isOccupied).toBe(false);
    expect(invalidTimeAvailability.statusLabel).toBe('Vacant');
  });
});

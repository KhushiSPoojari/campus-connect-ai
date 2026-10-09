import { describe, it, expect } from 'vitest';
import { getFacultyAvailability } from '@/lib/availability/faculty-availability';
import { FACULTY_DATA } from '@/data';

describe('Faculty Availability Engine', () => {
  const drMitchell = FACULTY_DATA.find(f => f.id === 'fac-01')!;

  it('determines when a faculty member is actively delivering a lecture', () => {
    // Dr. Mitchell has CS301 in LH-101 on Monday from 09:00 to 10:30
    const status = getFacultyAvailability(drMitchell, 'Monday', '09:45');
    expect(status.state).toBe('In Class');
    expect(status.currentLocation).toBe('LH-101');
    expect(status.currentActivity).toContain('Distributed Systems');
    expect(status.nextFreeTime).toBe('10:30');
    expect(status.activeSlot?.subjectCode).toBe('CS301');
  });

  it('determines when a faculty member is holding office hours in their cabin', () => {
    // Dr. Mitchell has OfficeHours on Monday from 10:30 to 12:00
    const status = getFacultyAvailability(drMitchell, 'Monday', '11:15');
    expect(status.state).toBe('In Office');
    expect(status.currentLocation).toContain('T-304');
    expect(status.currentActivity).toContain('Office Hours');
    expect(status.nextFreeTime).toBe('12:00');
  });

  it('shows Available in Cabin when faculty is on campus without conflicting lectures', () => {
    // Dr. Mitchell has no scheduled classes on Monday between 12:00 and 14:00
    const status = getFacultyAvailability(drMitchell, 'Monday', '12:30');
    expect(status.state).toBe('Available');
    expect(status.currentLocation).toContain('T-304');
    expect(status.currentActivity).toBe('Available in Cabin');
    expect(status.nextFreeTime).toBe('14:00'); // Next class is at 14:00
  });

  it('marks faculty as Off-duty on Sundays or outside working hours', () => {
    const sundayStatus = getFacultyAvailability(drMitchell, 'Sunday', '10:00');
    expect(sundayStatus.state).toBe('Off-duty');
    expect(sundayStatus.currentLocation).toBe('Off-Campus');

    const lateEveningStatus = getFacultyAvailability(drMitchell, 'Wednesday', '21:30');
    expect(lateEveningStatus.state).toBe('Off-duty');
  });

  it('safely handles null, undefined, or malformed faculty inputs', () => {
    const nullStatus = getFacultyAvailability(null, 'Monday', '10:00');
    expect(nullStatus.state).toBe('Off-duty');
    expect(nullStatus.currentLocation).toBe('Unknown');

    const invalidTimeStatus = getFacultyAvailability(drMitchell, 'Monday', 'invalid-time');
    expect(invalidTimeStatus.state).toBe('Off-duty');
  });
});

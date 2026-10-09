export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type ActivityType = 'Class' | 'OfficeHours' | 'Meeting' | 'Lab' | 'Free';

export interface FacultyTimeSlot {
  startTime: string; // "09:00" (24h format)
  endTime: string;   // "10:00"
  activity: ActivityType;
  location: string;
  subjectCode?: string;
  subjectName?: string;
}

export interface FacultyOffice {
  building: string;
  floor: string;
  roomNumber: string;
  landmark?: string;
}

export interface FacultyMember {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  office: FacultyOffice;
  subjects: string[];
  bio?: string;
  weeklySchedule: Record<string, FacultyTimeSlot[]>;
}

export type FacultyAvailabilityState = 'In Class' | 'In Office' | 'Available' | 'Off-duty';

export interface FacultyAvailability {
  state: FacultyAvailabilityState;
  currentLocation: string;
  currentActivity: string;
  nextFreeTime?: string;
  activeSlot?: FacultyTimeSlot;
}

export type ClassroomType = 'Lecture Hall' | 'Seminar Room' | 'Computer Lab' | 'Tutorial Room' | 'Auditorium';

export interface ClassroomSlot {
  startTime: string; // "09:00"
  endTime: string;   // "10:00"
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  batch: string;
}

export interface Classroom {
  id: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  floor: number;
  wing: 'North' | 'South' | 'East' | 'West' | 'Central';
  capacity: number;
  type: ClassroomType;
  amenities: string[]; // e.g. "Smart Projector", "Central AC", "Audio Mic", "Power Outlets", "Workstations"
  weeklySchedule: Record<string, ClassroomSlot[]>;
}

export interface ClassroomAvailability {
  isOccupied: boolean;
  statusLabel: 'Occupied' | 'Vacant';
  currentOccupant?: ClassroomSlot;
  nextOccupiedTime?: string;
  freeUntil?: string;
  freeForHours?: number;
  todaySchedule: ClassroomSlot[];
}

import type { FacultyMember } from '@/types/faculty';
import type { Classroom } from '@/types/classroom';
import type { Course } from '@/types/course';
import type { CampusNavigationGraph, CampusLocation } from '@/types/navigation';
import type { CampusEvent } from '@/types/event';

import facultyData from './faculty.json';
import classroomData from './classrooms.json';
import courseData from './courses.json';
import campusMapData from './campus-map.json';
import campusLocationsData from './campus-locations.json';
import eventsData from './events.json';

export const FACULTY_DATA: FacultyMember[] = facultyData as unknown as FacultyMember[];
export const CLASSROOM_DATA: Classroom[] = classroomData as unknown as Classroom[];
export const COURSE_DATA: Course[] = courseData as unknown as Course[];
export const CAMPUS_MAP_GRAPH: CampusNavigationGraph = campusMapData as unknown as CampusNavigationGraph;
export const CAMPUS_LOCATIONS: CampusLocation[] = campusLocationsData as unknown as CampusLocation[];
export const INITIAL_EVENTS: CampusEvent[] = eventsData as unknown as CampusEvent[];

/**
 * Metadata indicating this is a deterministic prototype/demo dataset.
 */
export const DATA_METADATA = {
  isPrototype: true,
  datasetVersion: '1.0.0-demo',
  notice: 'All names, rooms, schedules, and circulars are fictional demo artifacts for Campus Connect AI.',
} as const;

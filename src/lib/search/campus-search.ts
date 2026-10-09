import type { SearchResultItem, SearchEntityKind } from '@/types/search';
import { FACULTY_DATA, CLASSROOM_DATA, COURSE_DATA, CAMPUS_LOCATIONS, INITIAL_EVENTS } from '@/data';

export interface SearchOptions {
  limit?: number;
  kindFilter?: SearchEntityKind;
}

/**
 * Normalizes query string for case-insensitive, punctuation-lenient matching.
 */
function normalizeQuery(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Scores how well a target text matches the normalized query terms.
 */
function calculateMatchScore(target: string, queryTokens: string[], rawQuery: string): number {
  if (!target) return 0;
  const cleanTarget = target.toLowerCase();
  const rawTargetNorm = normalizeQuery(target);

  // Exact match bonus
  if (rawTargetNorm === rawQuery) return 100;

  // Substring match
  if (cleanTarget.includes(rawQuery)) return 75;

  // Word token matching
  let matchedTokens = 0;
  for (const token of queryTokens) {
    if (cleanTarget.includes(token)) {
      matchedTokens++;
    }
  }

  if (matchedTokens === 0) return 0;
  return Math.round((matchedTokens / queryTokens.length) * 60);
}

/**
 * Searches across faculty, subjects/courses, classrooms, offices/landmarks, and notices.
 * Fully local, case-insensitive, supports partial matches.
 */
export function searchCampus(query: string, options: SearchOptions = {}): SearchResultItem[] {
  if (!query || typeof query !== 'string') return [];
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const rawQuery = normalizeQuery(trimmed);
  const queryTokens = rawQuery.split(' ').filter(Boolean);
  if (queryTokens.length === 0) return [];

  const results: SearchResultItem[] = [];
  const { limit = 20, kindFilter } = options;

  // 1. Search Faculty
  if (!kindFilter || kindFilter === 'Faculty') {
    for (const faculty of FACULTY_DATA) {
      const officeStr = `${faculty.office.roomNumber} ${faculty.office.building} ${faculty.office.floor}`;
      const subjectsStr = faculty.subjects.join(' ');
      const combined = `${faculty.name} ${faculty.title} ${faculty.department} ${officeStr} ${subjectsStr}`;

      const nameScore = calculateMatchScore(faculty.name, queryTokens, rawQuery);
      const officeScore = calculateMatchScore(faculty.office.roomNumber, queryTokens, rawQuery);
      const deptScore = calculateMatchScore(faculty.department, queryTokens, rawQuery);
      const subjectsScore = calculateMatchScore(subjectsStr, queryTokens, rawQuery);
      const combinedScore = calculateMatchScore(combined, queryTokens, rawQuery);

      const score = Math.max(
        nameScore * 1.5,
        officeScore * 1.3,
        deptScore * 0.9,
        subjectsScore * 0.8,
        combinedScore * 0.7
      );

      if (score > 10) {
        results.push({
          id: faculty.id,
          kind: 'Faculty',
          title: faculty.name,
          subtitle: `${faculty.title} · ${faculty.department}`,
          badge: faculty.office.roomNumber,
          href: `/faculty?id=${faculty.id}`,
          score: Math.min(Math.round(score), 150),
          metadata: {
            roomOrLocation: `${faculty.office.roomNumber} (${faculty.office.building})`,
            department: faculty.department,
            extra: faculty.subjects.join(', '),
          },
        });
      }
    }
  }

  // 2. Search Courses / Subjects
  if (!kindFilter || kindFilter === 'Course') {
    for (const course of COURSE_DATA) {
      const combined = `${course.code} ${course.name} ${course.department} ${course.assignedLecturerName} ${course.lectureRoom}`;

      const codeScore = calculateMatchScore(course.code, queryTokens, rawQuery);
      const titleScore = calculateMatchScore(course.name, queryTokens, rawQuery);
      const lecturerScore = calculateMatchScore(course.assignedLecturerName, queryTokens, rawQuery);
      const deptScore = calculateMatchScore(course.department, queryTokens, rawQuery);
      const combinedScore = calculateMatchScore(combined, queryTokens, rawQuery);

      const score = Math.max(
        codeScore * 1.5,
        titleScore * 1.4,
        deptScore * 0.9,
        lecturerScore * 0.75, // Secondary cross-reference: lecturer name on a course
        combinedScore * 0.7
      );

      if (score > 10) {
        results.push({
          id: course.code,
          kind: 'Course',
          title: `${course.code}: ${course.name}`,
          subtitle: `Faculty: ${course.assignedLecturerName} · Room: ${course.lectureRoom}`,
          badge: course.code,
          href: `/faculty?subject=${course.code}`,
          score: Math.min(Math.round(score), 150),
          metadata: {
            code: course.code,
            department: course.department,
            roomOrLocation: course.lectureRoom,
            extra: `Assigned: ${course.assignedLecturerName}`,
          },
        });
      }
    }
  }

  // 3. Search Classrooms
  if (!kindFilter || kindFilter === 'Classroom') {
    for (const room of CLASSROOM_DATA) {
      const amenitiesStr = room.amenities.join(' ');
      const combined = `${room.roomNumber} ${room.buildingName} ${room.type} ${amenitiesStr}`;

      const score = Math.max(
        calculateMatchScore(room.roomNumber, queryTokens, rawQuery) * 1.4,
        calculateMatchScore(room.buildingName, queryTokens, rawQuery),
        calculateMatchScore(combined, queryTokens, rawQuery) * 0.8
      );

      if (score > 10) {
        results.push({
          id: room.id,
          kind: 'Classroom',
          title: `${room.roomNumber} (${room.type})`,
          subtitle: `${room.buildingName} · Floor ${room.floor} · Capacity: ${room.capacity}`,
          badge: room.roomNumber,
          href: `/classrooms?room=${room.roomNumber}`,
          score: Math.min(Math.round(score), 100),
          metadata: {
            roomOrLocation: `${room.roomNumber}, Floor ${room.floor}, ${room.buildingName}`,
            extra: `Capacity ${room.capacity} · ${room.amenities.slice(0, 2).join(', ')}`,
          },
        });
      }
    }
  }

  // 4. Search Campus Locations & Offices
  if (!kindFilter || kindFilter === 'Location') {
    for (const loc of CAMPUS_LOCATIONS) {
      const tagsStr = loc.tags.join(' ');
      const roomStr = loc.roomOrOffice || '';
      const combined = `${loc.name} ${loc.building} ${loc.floor} ${roomStr} ${loc.landmark} ${tagsStr}`;

      const score = Math.max(
        calculateMatchScore(loc.name, queryTokens, rawQuery) * 1.2,
        calculateMatchScore(roomStr, queryTokens, rawQuery) * 1.3,
        calculateMatchScore(loc.landmark, queryTokens, rawQuery),
        calculateMatchScore(tagsStr, queryTokens, rawQuery),
        calculateMatchScore(combined, queryTokens, rawQuery) * 0.8
      );

      if (score > 10) {
        results.push({
          id: loc.id,
          kind: 'Location',
          title: loc.name,
          subtitle: `${loc.building}, ${loc.floor} · ${loc.landmark}`,
          badge: loc.roomOrOffice || loc.building,
          href: `/navigation?to=${loc.nodeId}`,
          score: Math.min(Math.round(score), 100),
          metadata: {
            roomOrLocation: `${loc.roomOrOffice || ''} ${loc.building}`,
            extra: loc.landmark,
          },
        });
      }
    }
  }

  // 5. Search Events & Notices
  if (!kindFilter || kindFilter === 'Notice') {
    for (const event of INITIAL_EVENTS) {
      const combined = `${event.title} ${event.category} ${event.venue} ${event.coordinator} ${event.summary}`;

      const score = Math.max(
        calculateMatchScore(event.title, queryTokens, rawQuery) * 1.2,
        calculateMatchScore(event.category, queryTokens, rawQuery),
        calculateMatchScore(event.coordinator, queryTokens, rawQuery),
        calculateMatchScore(combined, queryTokens, rawQuery) * 0.7
      );

      if (score > 10) {
        results.push({
          id: event.id,
          kind: 'Notice',
          title: event.title,
          subtitle: `${event.category} · ${event.date} · Venue: ${event.venue}`,
          badge: event.category,
          href: `/notices?id=${event.id}`,
          score: Math.min(Math.round(score), 100),
          metadata: {
            roomOrLocation: event.venue,
            extra: `Coordinator: ${event.coordinator}`,
          },
        });
      }
    }
  }

  // Sort descending by score, then alphabetically
  return results
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

import { describe, it, expect } from 'vitest';
import { searchCampus } from '@/lib/search/campus-search';

describe('Campus Search Engine', () => {
  it('performs exact search matching for course codes and faculty names', () => {
    const courseResults = searchCampus('CS301');
    expect(courseResults.length).toBeGreaterThan(0);
    expect(courseResults[0].kind).toBe('Course');
    expect(courseResults[0].title).toContain('CS301');

    const facultyResults = searchCampus('Dr. Sarah Mitchell');
    expect(facultyResults.length).toBeGreaterThan(0);
    expect(facultyResults[0].kind).toBe('Faculty');
    expect(facultyResults[0].title).toBe('Dr. Sarah Mitchell');
  });

  it('performs partial search for substrings and prefix queries', () => {
    // "distrib" should match "Distributed Systems"
    const partialResults = searchCampus('distrib');
    expect(partialResults.length).toBeGreaterThan(0);
    const hasMatch = partialResults.some(r => r.title.toLowerCase().includes('distributed'));
    expect(hasMatch).toBe(true);

    // "vance" should match "Prof. David Vance"
    const vanceResults = searchCampus('vance');
    expect(vanceResults.some(r => r.title.includes('David Vance'))).toBe(true);
  });

  it('performs case-insensitive search matching regardless of casing', () => {
    const upper = searchCampus('TURING');
    const lower = searchCampus('turing');
    const mixed = searchCampus('TuRiNg');

    expect(upper.length).toBeGreaterThan(0);
    expect(upper.length).toBe(lower.length);
    expect(upper.length).toBe(mixed.length);
  });

  it('matches subject queries to their assigned faculty members', () => {
    // Searching "Machine Learning" should surface AI302 and Dr. Elena Rostova
    const results = searchCampus('Machine Learning');
    expect(results.length).toBeGreaterThan(0);

    const courseMatch = results.find(r => r.kind === 'Course' && r.title.includes('Machine Learning'));
    expect(courseMatch).toBeDefined();
    expect(courseMatch?.metadata.extra).toContain('Dr. Elena Rostova');
  });

  it('matches room and office queries accurately', () => {
    // Searching room code "T-304"
    const cabinResults = searchCampus('T-304');
    expect(cabinResults.length).toBeGreaterThan(0);
    expect(cabinResults.some(r => r.badge === 'T-304' || r.badge.includes('T-304'))).toBe(true);

    // Searching lecture hall "LH-101"
    const hallResults = searchCampus('LH-101');
    expect(hallResults.length).toBeGreaterThan(0);
    expect(hallResults.some(r => r.kind === 'Classroom' && r.badge === 'LH-101')).toBe(true);
  });

  it('returns empty array when no matches exist', () => {
    const emptyResults = searchCampus('xyznonexistentquery999');
    expect(emptyResults).toEqual([]);
  });

  it('safely handles empty queries, spaces, and special symbols', () => {
    expect(searchCampus('')).toEqual([]);
    expect(searchCampus('   ')).toEqual([]);
    expect(searchCampus('!@#$%^&*()')).toEqual([]);
  });

  it('respects entity kind filtering when specified', () => {
    const facultyOnly = searchCampus('Turing', { kindFilter: 'Faculty' });
    expect(facultyOnly.every(r => r.kind === 'Faculty')).toBe(true);

    const classroomOnly = searchCampus('Turing', { kindFilter: 'Classroom' });
    expect(classroomOnly.every(r => r.kind === 'Classroom')).toBe(true);
  });
});

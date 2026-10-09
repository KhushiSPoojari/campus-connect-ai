'use client';

import React, { useState, useMemo } from 'react';
import { useCampusTime } from '@/lib/context/campus-time-context';
import { FACULTY_DATA, COURSE_DATA } from '@/data';
import { FacultyCard } from '@/components/student/FacultyCard';
import { getFacultyAvailability } from '@/lib/availability/faculty-availability';
import { Users, Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function FacultyPage() {
  const { day, timeStr } = useCampusTime();

  // Active view tab: 'faculty' | 'subjects'
  const [activeTab, setActiveTab] = useState<'faculty' | 'subjects'>('faculty');

  // Faculty filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Subject search
  const [subjectQuery, setSubjectQuery] = useState('');

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set(FACULTY_DATA.map(f => f.department));
    return ['All', ...Array.from(set)];
  }, []);

  // Filtered faculty list
  const filteredFaculty = useMemo(() => {
    return FACULTY_DATA.filter(faculty => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = faculty.name.toLowerCase().includes(q);
        const matchesDept = faculty.department.toLowerCase().includes(q);
        const matchesCabin = faculty.office.roomNumber.toLowerCase().includes(q);
        const matchesSubj = faculty.subjects.some(s => s.toLowerCase().includes(q));
        if (!matchesName && !matchesDept && !matchesCabin && !matchesSubj) {
          return false;
        }
      }

      // Department filter
      if (selectedDept !== 'All' && faculty.department !== selectedDept) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'All') {
        const avail = getFacultyAvailability(faculty, day, timeStr);
        if (avail.state !== selectedStatus) {
          return false;
        }
      }

      return true;
    });
  }, [searchQuery, selectedDept, selectedStatus, day, timeStr]);

  // Filtered subjects list
  const filteredCourses = useMemo(() => {
    if (!subjectQuery.trim()) return COURSE_DATA;
    const q = subjectQuery.toLowerCase();
    return COURSE_DATA.filter(
      c =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.assignedLecturerName.toLowerCase().includes(q) ||
        c.lectureRoom.toLowerCase().includes(q)
    );
  }, [subjectQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Faculty Directory & Availability
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Locate professor cabins, track real-time lecture timetables, and map syllabus subjects to coordinators.
          </p>
        </div>

        {/* Tab switch */}
        <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('faculty')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'faculty'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Faculty Directory ({FACULTY_DATA.length})
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'subjects'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Subject-to-Lecturer Finder ({COURSE_DATA.length})
          </button>
        </div>
      </div>

      {activeTab === 'faculty' ? (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Search text */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by professor, subject, or cabin..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Department selector */}
              <div>
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept === 'All' ? 'All Departments' : dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status selector */}
              <div>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="All">All Availability States</option>
                  <option value="Available">Available in Cabin</option>
                  <option value="In Office">In Office (Hours / Meetings)</option>
                  <option value="In Class">In Class / Teaching</option>
                  <option value="Off-duty">Off-duty</option>
                </select>
              </div>
            </div>

            {/* Active Query Status summary */}
            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800">
              <span>
                Showing <strong>{filteredFaculty.length}</strong> of {FACULTY_DATA.length} faculty members
              </span>
              {(searchQuery || selectedDept !== 'All' || selectedStatus !== 'All') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDept('All');
                    setSelectedStatus('All');
                  }}
                  className="text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Faculty Card Grid */}
          {filteredFaculty.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFaculty.map(faculty => (
                <FacultyCard
                  key={faculty.id}
                  faculty={faculty}
                  day={day}
                  timeStr={timeStr}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
              <Users className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
              <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                No faculty members found
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                No faculty members match your selected filters. Try broadening your search or resetting department and status options.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDept('All');
                  setSelectedStatus('All');
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Subject-to-Lecturer Finder Tab */
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="text"
                value={subjectQuery}
                onChange={e => setSubjectQuery(e.target.value)}
                placeholder="Search subject code (e.g. CS301), subject title, or assigned professor..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Course Code</th>
                    <th className="py-3 px-4">Subject Title</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Assigned Professor</th>
                    <th className="py-3 px-4">Lecture Room</th>
                    <th className="py-3 px-4">Schedule Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredCourses.map(course => (
                    <tr
                      key={course.code}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {course.code}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        {course.name}
                        <p className="text-[11px] text-zinc-400 font-normal mt-0.5 line-clamp-1">
                          {course.syllabusSummary}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-500">
                        {course.department}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-zinc-800 dark:text-zinc-200">
                        {course.assignedLecturerName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 font-semibold text-zinc-700 dark:text-zinc-300">
                          {course.lectureRoom}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                        {course.scheduleSummary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredCourses.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-500">
                No subjects found matching &ldquo;{subjectQuery}&rdquo;.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

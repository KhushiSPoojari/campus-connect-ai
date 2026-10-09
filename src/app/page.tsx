'use client';

import React from 'react';
import Link from 'next/link';
import { OmniSearch } from '@/components/student/OmniSearch';
import { useCampusTime } from '@/lib/context/campus-time-context';
import { getClassroomAvailability } from '@/lib/availability/classroom-availability';
import { getFacultyAvailability } from '@/lib/availability/faculty-availability';
import { CLASSROOM_DATA, FACULTY_DATA, COURSE_DATA } from '@/data';
import { useEvents } from '@/lib/events/use-events';
import {
  Users,
  DoorOpen,
  BookOpen,
  MapPin,
  Bell,
  Sparkles,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function StudentHomePage() {
  const { day, timeStr } = useCampusTime();
  const { events } = useEvents();

  // Compute live occupancy metrics for active campus time
  const vacantRoomsCount = CLASSROOM_DATA.filter(room => {
    const avail = getClassroomAvailability(room, day, timeStr);
    return !avail.isOccupied;
  }).length;

  const facultyInClassCount = FACULTY_DATA.filter(fac => {
    const avail = getFacultyAvailability(fac, day, timeStr);
    return avail.state === 'In Class';
  }).length;

  return (
    <div className="flex-1 space-y-10 pb-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-indigo-900 via-indigo-950 to-zinc-950 text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-indigo-900/50">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-800/60 border border-indigo-700/80 text-indigo-200 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Smart Campus Solutions · Prototype Production Build</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Instant Campus Intelligence & Classroom Optimization
          </h1>

          <p className="text-sm sm:text-base text-indigo-200/90 max-w-2xl mx-auto leading-relaxed">
            Eliminating fragmented campus inquiries and classroom under-utilization with zero-latency local search, deterministic timetables, and wayfinding.
          </p>

          {/* Prominent Omni-Search */}
          <div className="max-w-3xl mx-auto pt-4 text-left">
            <OmniSearch autoFocus={false} />
            <div className="flex items-center gap-2 flex-wrap text-xs text-indigo-300/80 mt-2.5 px-1">
              <span>Popular searches:</span>
              {['CS301', 'Dr. Sarah Mitchell', 'LH-101', 'Turing Tower', 'Hackathon'].map(chip => (
                <span
                  key={chip}
                  className="bg-indigo-800/40 hover:bg-indigo-800/80 text-indigo-200 px-2 py-0.5 rounded border border-indigo-700/50 cursor-pointer text-[11px]"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Live Space & Faculty Utilization Banner */}
        <section aria-labelledby="live-status-heading">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <h2 id="live-status-heading" className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Live Campus Utilization Status
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Calculated deterministically for <strong className="text-zinc-800 dark:text-zinc-200">{day}, {timeStr}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-400">Change time using the top toolbar</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {/* Metric 1 */}
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/60 flex items-center gap-3">
                <div className="p-3 rounded-lg bg-emerald-600 text-white">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                    Vacant Classrooms Now
                  </span>
                  <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                    {vacantRoomsCount} <span className="text-xs font-normal text-zinc-500">/ {CLASSROOM_DATA.length} spaces</span>
                  </p>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 flex items-center gap-3">
                <div className="p-3 rounded-lg bg-indigo-600 text-white">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-indigo-800 dark:text-indigo-300 font-medium">
                    Faculty Teaching in Lecture
                  </span>
                  <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                    {facultyInClassCount} <span className="text-xs font-normal text-zinc-500">/ {FACULTY_DATA.length} professors</span>
                  </p>
                </div>
              </div>

              {/* Metric 3 */}
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/60 flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-600 text-white">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-purple-800 dark:text-purple-300 font-medium">
                    Curriculum Offerings
                  </span>
                  <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                    {COURSE_DATA.length} <span className="text-xs font-normal text-zinc-500">active courses</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5 Quick Access Hub Cards */}
        <section aria-labelledby="quick-hubs-heading">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 id="quick-hubs-heading" className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Core Student Services
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Direct access to faculty locators, room vacancy matrices, and wayfinding.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Hub 1: Faculty */}
            <Link
              href="/faculty"
              className="group p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Faculty Finder & Cabins
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Look up professors, office room numbers, departments, and live lecture vs. office hour availability.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span>View {FACULTY_DATA.length} Faculty Profiles</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Hub 2: Classrooms */}
            <Link
              href="/classrooms"
              className="group p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Classroom Availability Matrix
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Real-time vacancy checker to find free study halls, seminar spaces, and lab workstations without conflicts.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span>{vacantRoomsCount} Vacant Spaces Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Hub 3: Subjects & Courses */}
            <Link
              href="/faculty?tab=subjects"
              className="group p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-sky-400 dark:hover:border-sky-600 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  Subject-to-Lecturer Finder
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Match course codes (e.g. CS301, AI302) to assigned professors, lecture halls, and weekly class times.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-sky-600 dark:text-sky-400">
                <span>Browse {COURSE_DATA.length} Courses</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Hub 4: Campus Map & Navigation */}
            <Link
              href="/navigation"
              className="group p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Campus Wayfinder & Map
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Interactive vector map with turn-by-turn walking directions between gates, towers, labs, and student centers.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
                <span>Open Offline Map</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Hub 5: Notices & Events */}
            <Link
              href="/notices"
              className="group p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-md transition-all flex flex-col justify-between sm:col-span-2 lg:col-span-2"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Bell className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Official Circulars & Campus Events
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Verified campus bulletins: examination dates, placement drives, technical symposiums, and cultural fests.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
                <span>View {events.length} Notices</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </section>

        {/* Featured Notices Spotlight */}
        <section aria-labelledby="featured-notices-heading">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 id="featured-notices-heading" className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Upcoming Notices & Circulars
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Latest institutional circulars processed for student awareness.
              </p>
            </div>
            <Link
              href="/notices"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View All Notices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {events.slice(0, 3).map(event => (
              <div
                key={event.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="primary">{event.category}</Badge>
                    <span className="text-[11px] text-zinc-400 font-mono">{event.date}</span>
                  </div>
                  <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1 mb-1">
                    {event.title}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {event.summary}
                  </p>
                </div>
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-3 text-[11px] text-zinc-400 flex items-center justify-between">
                  <span className="truncate">Venue: {event.venue.split(',')[0]}</span>
                  <Link href="/notices" className="text-indigo-600 font-medium hover:underline shrink-0">
                    Read →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

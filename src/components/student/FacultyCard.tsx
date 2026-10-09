'use client';

import React, { useState } from 'react';
import type { FacultyMember } from '@/types/faculty';
import { getFacultyAvailability } from '@/lib/availability/faculty-availability';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Building,
  Mail,
  Phone,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Briefcase,
  Moon,
} from 'lucide-react';

interface FacultyCardProps {
  faculty: FacultyMember;
  day: string;
  timeStr: string;
}

export function FacultyCard({ faculty, day, timeStr }: FacultyCardProps) {
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const availability = getFacultyAvailability(faculty, day, timeStr);

  const getStatusConfig = () => {
    switch (availability.state) {
      case 'In Class':
        return {
          variant: 'danger' as const,
          icon: AlertCircle,
          label: 'In Class / Lecture',
          subtext: availability.currentActivity,
          locationNote: `Location: ${availability.currentLocation}`,
        };
      case 'In Office':
        return {
          variant: 'warning' as const,
          icon: Briefcase,
          label: 'In Office (Meeting / Hours)',
          subtext: availability.currentActivity,
          locationNote: availability.currentLocation,
        };
      case 'Available':
        return {
          variant: 'success' as const,
          icon: CheckCircle,
          label: 'Available in Cabin',
          subtext: availability.nextFreeTime
            ? `Available until next lecture at ${availability.nextFreeTime}`
            : 'Available for consultations',
          locationNote: availability.currentLocation,
        };
      case 'Off-duty':
      default:
        return {
          variant: 'neutral' as const,
          icon: Moon,
          label: 'Off-Duty / Outside Hours',
          subtext: 'Not currently scheduled on campus',
          locationNote: 'Off-Campus',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
        <div>
          {/* Header & Status */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                {faculty.name}
              </h3>
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                {faculty.title}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {faculty.department}
              </p>
            </div>
            {/* Availability Badge */}
            <Badge variant={statusConfig.variant} className="shrink-0">
              <StatusIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{statusConfig.label}</span>
            </Badge>
          </div>

          {/* Current Activity Status Banner */}
          <div className="mb-4 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 text-xs space-y-1">
            <div className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{statusConfig.subtext}</span>
            </div>
            <div className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 pl-5">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>{statusConfig.locationNote}</span>
            </div>
          </div>

          {/* Office & Cabin Details */}
          <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300 mb-4">
            <div className="flex items-start gap-2">
              <Building className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">Cabin {faculty.office.roomNumber}:</span>{' '}
                <span>{faculty.office.building}, {faculty.office.floor}</span>
                {faculty.office.landmark && (
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Landmark: {faculty.office.landmark}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <a
                href={`mailto:${faculty.email}`}
                className="text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 underline truncate"
              >
                {faculty.email}
              </a>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>{faculty.phone}</span>
            </div>
          </div>

          {/* Subjects Taught */}
          <div className="mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Subjects & Courses:
            </span>
            <div className="flex flex-wrap gap-1">
              {faculty.subjects.map(subj => (
                <span
                  key={subj}
                  className="inline-flex items-center gap-1 text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700"
                >
                  <BookOpen className="w-3 h-3 text-zinc-400" />
                  {subj}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">
            Checking: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{day} {timeStr}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScheduleModalOpen(true)}
            aria-label={`View weekly timetable for ${faculty.name}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Weekly Timetable</span>
          </Button>
        </div>
      </div>

      {/* Weekly Schedule Modal */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title={`Weekly Timetable: ${faculty.name}`}
        description={`${faculty.title} · ${faculty.department} · Cabin ${faculty.office.roomNumber}`}
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs flex items-center justify-between">
            <span className="text-zinc-600 dark:text-zinc-300">
              Cabin Location: <strong>{faculty.office.roomNumber}</strong>, {faculty.office.building} ({faculty.office.floor})
            </span>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>

          <div className="space-y-3">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => {
              const slots = faculty.weeklySchedule[d] || [];
              const isToday = d.toLowerCase() === day.toLowerCase();

              return (
                <div
                  key={d}
                  className={`p-3 rounded-lg border ${
                    isToday
                      ? 'border-indigo-300 bg-indigo-50/40 dark:border-indigo-800 dark:bg-indigo-950/20'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                      {d} {isToday && <span className="text-indigo-600 font-bold">(Selected Day)</span>}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {slots.length} scheduled period{slots.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {slots.length > 0 ? (
                    <div className="space-y-1.5">
                      {slots.map((slot, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-2 rounded bg-zinc-50 dark:bg-zinc-800/80"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-zinc-500 font-medium">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">
                              {slot.activity === 'Class' || slot.activity === 'Lab'
                                ? `${slot.subjectName || slot.subjectCode || 'Class'}`
                                : slot.activity === 'OfficeHours'
                                ? 'Office Hours / Consultations'
                                : slot.activity === 'Meeting'
                                ? 'Departmental Meeting'
                                : 'Available in Cabin'}
                            </span>
                          </div>
                          <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px] bg-white dark:bg-zinc-700 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-600">
                            {slot.location}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">No scheduled lectures; Available in Cabin.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </>
  );
}

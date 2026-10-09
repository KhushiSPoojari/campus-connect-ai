'use client';

import React, { useState } from 'react';
import type { Classroom } from '@/types/classroom';
import { getClassroomAvailability } from '@/lib/availability/classroom-availability';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Layers,
} from 'lucide-react';

interface ClassroomCardProps {
  classroom: Classroom;
  day: string;
  timeStr: string;
}

export function ClassroomCard({ classroom, day, timeStr }: ClassroomCardProps) {
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const availability = getClassroomAvailability(classroom, day, timeStr);

  const isOccupied = availability.isOccupied;

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                  {classroom.roomNumber}
                </h3>
                <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-md font-medium">
                  {classroom.type}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {classroom.buildingName} · Floor {classroom.floor} ({classroom.wing} Wing)
              </p>
            </div>

            {/* Occupancy Status Badge */}
            {isOccupied ? (
              <Badge variant="danger" className="shrink-0">
                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Currently Occupied</span>
              </Badge>
            ) : (
              <Badge variant="success" className="shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Vacant Now</span>
              </Badge>
            )}
          </div>

          {/* Occupancy Status Details Banner */}
          <div className="mb-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 text-xs">
            {isOccupied && availability.currentOccupant ? (
              <div className="space-y-1">
                <div className="font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Lecture in progress until {availability.currentOccupant.endTime}
                  </span>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300">
                  {availability.currentOccupant.subjectCode}: {availability.currentOccupant.subjectName}
                </p>
                <p className="text-zinc-500 text-[11px]">
                  Instructor: {availability.currentOccupant.facultyName} ({availability.currentOccupant.batch})
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Available for Study & Tutorials</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-300">
                  {availability.nextOccupiedTime
                    ? `Free for ${availability.freeForHours} hours (until next class at ${availability.nextOccupiedTime})`
                    : `Free for the rest of the day (until ${availability.freeUntil})`}
                </p>
              </div>
            )}
          </div>

          {/* Metadata Specs */}
          <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-300 mb-4">
            <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-lg">
              <Users className="w-4 h-4 text-zinc-400" />
              <span>Capacity: <strong className="text-zinc-900 dark:text-zinc-100">{classroom.capacity}</strong> seats</span>
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-lg">
              <Layers className="w-4 h-4 text-zinc-400" />
              <span>Wing: <strong className="text-zinc-900 dark:text-zinc-100">{classroom.wing}</strong></span>
            </div>
          </div>

          {/* Facilities / Amenities */}
          <div className="mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Equipped Facilities:
            </span>
            <div className="flex flex-wrap gap-1">
              {classroom.amenities.map(amenity => (
                <span
                  key={amenity}
                  className="text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">
            Day: <strong className="text-zinc-700 dark:text-zinc-300">{day}</strong>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScheduleModalOpen(true)}
            aria-label={`View schedule for ${classroom.roomNumber}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Full Schedule</span>
          </Button>
        </div>
      </div>

      {/* Full Schedule Modal */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title={`Room Timetable: ${classroom.roomNumber}`}
        description={`${classroom.buildingName} · Floor ${classroom.floor} · Capacity ${classroom.capacity}`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs">
            <span>
              Query Time: <strong>{day}, {timeStr}</strong>
            </span>
            {isOccupied ? (
              <Badge variant="danger">Occupied at this hour</Badge>
            ) : (
              <Badge variant="success">Vacant at this hour</Badge>
            )}
          </div>

          <div className="space-y-3">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => {
              const slots = classroom.weeklySchedule[d] || [];
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
                      {slots.length} class{slots.length !== 1 ? 'es' : ''} scheduled
                    </span>
                  </div>

                  {slots.length > 0 ? (
                    <div className="space-y-1.5">
                      {slots.map((slot, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-2 rounded bg-zinc-50 dark:bg-zinc-800/80"
                        >
                          <div>
                            <span className="font-mono text-zinc-500 font-medium mr-2">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <strong className="text-zinc-800 dark:text-zinc-200">
                              {slot.subjectCode}: {slot.subjectName}
                            </strong>
                          </div>
                          <span className="text-zinc-500 text-[11px]">
                            {slot.facultyName} ({slot.batch})
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 italic">
                      ✓ Entirely vacant all day - open for group study and unscheduled tutorials.
                    </p>
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

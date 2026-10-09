import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server-auth';
import {
  getClassroomByIdFromDb,
  updateClassroomInDb,
} from '@/lib/db/database';
import type { ClassroomSlot } from '@/types/classroom';

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const body = await request.json();
    const { classroomId, day, slot } = body as {
      classroomId: string;
      day: string;
      slot: ClassroomSlot;
    };

    if (!classroomId || !day || !slot?.startTime || !slot?.endTime || !slot?.subjectName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Classroom ID, day of week, start time, end time, and subject name are required.',
        },
        { status: 400 }
      );
    }

    const classroom = getClassroomByIdFromDb(classroomId);
    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Target classroom not found.' },
        { status: 404 }
      );
    }

    const schedule = classroom.weeklySchedule || {};
    const daySchedule = schedule[day] ? [...schedule[day]] : [];

    // Add slot
    daySchedule.push({
      startTime: slot.startTime,
      endTime: slot.endTime,
      subjectCode: slot.subjectCode || 'GEN101',
      subjectName: slot.subjectName,
      facultyName: slot.facultyName || 'Faculty In-Charge',
      batch: slot.batch || 'All Batches',
    });

    // Sort by startTime
    daySchedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
    schedule[day] = daySchedule;
    classroom.weeklySchedule = schedule;

    updateClassroomInDb(classroom);

    return NextResponse.json({
      success: true,
      classroom,
      message: `Schedule slot added for ${day} in ${classroom.roomNumber}.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update timetable.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireAdmin(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const body = await request.json();
    const { classroomId, day, slotIndex } = body as {
      classroomId: string;
      day: string;
      slotIndex: number;
    };

    if (!classroomId || !day || typeof slotIndex !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Classroom ID, day, and slotIndex are required.' },
        { status: 400 }
      );
    }

    const classroom = getClassroomByIdFromDb(classroomId);
    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Target classroom not found.' },
        { status: 404 }
      );
    }

    const schedule = classroom.weeklySchedule || {};
    if (!schedule[day] || !schedule[day][slotIndex]) {
      return NextResponse.json(
        { success: false, error: 'Specified schedule slot does not exist.' },
        { status: 404 }
      );
    }

    schedule[day].splice(slotIndex, 1);
    classroom.weeklySchedule = schedule;

    updateClassroomInDb(classroom);

    return NextResponse.json({
      success: true,
      classroom,
      message: `Slot removed from ${day} in ${classroom.roomNumber}.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove timetable slot.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server-auth';
import {
  getAllClassroomsFromDb,
  insertClassroomIntoDb,
  updateClassroomInDb,
  deleteClassroomFromDb,
} from '@/lib/db/database';
import type { Classroom } from '@/types/classroom';

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const classrooms = getAllClassroomsFromDb();
    return NextResponse.json({ success: true, classrooms });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch classrooms.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const body = await request.json();

    if (!body.roomNumber || !body.buildingName || !body.capacity) {
      return NextResponse.json(
        { success: false, error: 'Room number, building name, and capacity are required.' },
        { status: 400 }
      );
    }

    const classroom: Classroom = {
      id: body.id || `room-${Date.now()}`,
      roomNumber: body.roomNumber.trim(),
      buildingId: body.buildingId || body.buildingName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      buildingName: body.buildingName.trim(),
      floor: Number(body.floor) || 1,
      wing: body.wing || 'Central',
      capacity: Number(body.capacity) || 30,
      type: body.type || 'Lecture Hall',
      amenities: Array.isArray(body.amenities) ? body.amenities : ['Whiteboard', 'Projector'],
      weeklySchedule: body.weeklySchedule || {},
    };

    insertClassroomIntoDb(classroom);

    return NextResponse.json(
      { success: true, classroom, message: 'Classroom added successfully.' },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add classroom.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = requireAdmin(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const body = await request.json();

    if (!body.id || !body.roomNumber) {
      return NextResponse.json(
        { success: false, error: 'Classroom ID and room number are required.' },
        { status: 400 }
      );
    }

    const classroom: Classroom = {
      id: body.id,
      roomNumber: body.roomNumber.trim(),
      buildingId: body.buildingId || 'bldg-main',
      buildingName: body.buildingName?.trim() || 'Academic Block',
      floor: Number(body.floor) || 1,
      wing: body.wing || 'Central',
      capacity: Number(body.capacity) || 30,
      type: body.type || 'Lecture Hall',
      amenities: Array.isArray(body.amenities) ? body.amenities : [],
      weeklySchedule: body.weeklySchedule || {},
    };

    const updated = updateClassroomInDb(classroom);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Classroom not found or could not be updated.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      classroom,
      message: 'Classroom updated successfully.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update classroom.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireAdmin(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const url = new URL(request.url);
    let id = url.searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {
        // query param is fine
      }
    }

    if (!id || id.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Classroom ID is required for deletion.' },
        { status: 400 }
      );
    }

    const deleted = deleteClassroomFromDb(id.trim());
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Classroom not found or could not be deleted.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Classroom deleted successfully.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete classroom.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

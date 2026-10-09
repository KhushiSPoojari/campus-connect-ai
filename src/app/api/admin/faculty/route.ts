import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server-auth';
import {
  getAllFacultyFromDb,
  insertFacultyIntoDb,
  updateFacultyInDb,
  deleteFacultyFromDb,
} from '@/lib/db/database';
import type { FacultyMember } from '@/types/faculty';

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const faculty = getAllFacultyFromDb();
    return NextResponse.json({ success: true, faculty });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch faculty.';
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

    if (!body.name || !body.department || !body.email) {
      return NextResponse.json(
        { success: false, error: 'Faculty name, department, and email are required.' },
        { status: 400 }
      );
    }

    const faculty: FacultyMember = {
      id: body.id || `fac-${Date.now()}`,
      name: body.name.trim(),
      title: body.title?.trim() || 'Assistant Professor',
      department: body.department.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone?.trim() || '+1 (555) 010-0000',
      office: body.office || {
        building: 'Main Academic Block',
        floor: '2nd Floor',
        roomNumber: 'Room 201',
      },
      subjects: Array.isArray(body.subjects) ? body.subjects : [],
      bio: body.bio?.trim() || undefined,
      weeklySchedule: body.weeklySchedule || {},
    };

    insertFacultyIntoDb(faculty);

    return NextResponse.json(
      { success: true, faculty, message: 'Faculty member added successfully.' },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add faculty member.';
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

    if (!body.id || !body.name) {
      return NextResponse.json(
        { success: false, error: 'Faculty ID and name are required.' },
        { status: 400 }
      );
    }

    const faculty: FacultyMember = {
      id: body.id,
      name: body.name.trim(),
      title: body.title?.trim() || 'Professor',
      department: body.department?.trim() || 'General Engineering',
      email: body.email?.trim().toLowerCase() || 'faculty@campus.edu',
      phone: body.phone?.trim() || '',
      office: body.office || {
        building: 'Academic Block',
        floor: '1st Floor',
        roomNumber: '101',
      },
      subjects: Array.isArray(body.subjects) ? body.subjects : [],
      bio: body.bio?.trim() || undefined,
      weeklySchedule: body.weeklySchedule || {},
    };

    const updated = updateFacultyInDb(faculty);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Faculty record not found or could not be updated.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      faculty,
      message: 'Faculty member updated successfully.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update faculty member.';
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
        { success: false, error: 'Faculty ID is required for deletion.' },
        { status: 400 }
      );
    }

    const deleted = deleteFacultyFromDb(id.trim());
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Faculty record not found or could not be deleted.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Faculty record deleted successfully.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete faculty member.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

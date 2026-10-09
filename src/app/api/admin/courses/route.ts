import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server-auth';
import {
  getAllCoursesFromDb,
  insertCourseIntoDb,
  updateCourseInDb,
  deleteCourseFromDb,
} from '@/lib/db/database';
import type { Course } from '@/types/course';

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const courses = getAllCoursesFromDb();
    return NextResponse.json({ success: true, courses });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch courses.';
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

    if (!body.code || !body.name || !body.department) {
      return NextResponse.json(
        { success: false, error: 'Course code, name, and department are required.' },
        { status: 400 }
      );
    }

    const course: Course = {
      code: body.code.trim().toUpperCase(),
      name: body.name.trim(),
      department: body.department.trim(),
      semester: Number(body.semester) || 1,
      credits: Number(body.credits) || 3,
      assignedLecturerId: body.assignedLecturerId?.trim() || 'fac-01',
      assignedLecturerName: body.assignedLecturerName?.trim() || 'Staff Faculty',
      lectureRoom: body.lectureRoom?.trim() || 'LH-101',
      scheduleSummary: body.scheduleSummary?.trim() || 'Mon, Wed: 10:00 - 11:30 AM',
      syllabusSummary: body.syllabusSummary?.trim() || 'Comprehensive course syllabus and laboratory modules.',
    };

    insertCourseIntoDb(course);

    return NextResponse.json(
      { success: true, course, message: 'Course added successfully.' },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add course.';
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

    if (!body.code || !body.name) {
      return NextResponse.json(
        { success: false, error: 'Course code and name are required.' },
        { status: 400 }
      );
    }

    const course: Course = {
      code: body.code.trim().toUpperCase(),
      name: body.name.trim(),
      department: body.department?.trim() || 'Engineering',
      semester: Number(body.semester) || 1,
      credits: Number(body.credits) || 3,
      assignedLecturerId: body.assignedLecturerId?.trim() || '',
      assignedLecturerName: body.assignedLecturerName?.trim() || '',
      lectureRoom: body.lectureRoom?.trim() || 'LH-101',
      scheduleSummary: body.scheduleSummary?.trim() || '',
      syllabusSummary: body.syllabusSummary?.trim() || '',
    };

    const updated = updateCourseInDb(course);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Course not found or could not be updated.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      course,
      message: 'Course updated successfully.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update course.';
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
    let code = url.searchParams.get('code');

    if (!code) {
      try {
        const body = await request.json();
        code = body?.code;
      } catch {
        // query param is fine
      }
    }

    if (!code || code.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Course code is required for deletion.' },
        { status: 400 }
      );
    }

    const deleted = deleteCourseFromDb(code.trim().toUpperCase());
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Course not found or could not be deleted.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete course.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

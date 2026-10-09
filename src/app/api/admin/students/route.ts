import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server-auth';
import { getAllStudentsFromDb, deleteStudentFromDb } from '@/lib/db/database';
import { registerStudent } from '@/lib/auth/auth-service';

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const students = getAllStudentsFromDb();
    return NextResponse.json({
      success: true,
      students,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch student accounts.';
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
    const student = registerStudent({
      name: body.name,
      email: body.email,
      password: body.password,
      confirmPassword: body.confirmPassword || body.password,
      department: body.department,
      studentId: body.studentId,
    });

    return NextResponse.json(
      {
        success: true,
        student,
        message: 'Student account created successfully.',
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create student account.';
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
        { success: false, error: 'Student ID is required for deletion.' },
        { status: 400 }
      );
    }

    const deleted = deleteStudentFromDb(id.trim());
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Student record not found or could not be deleted.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Student account deleted successfully.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete student account.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

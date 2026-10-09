import { NextResponse } from 'next/server';
import { getAllFacultyFromDb } from '@/lib/db/database';
import { FACULTY_DATA } from '@/data';

export async function GET() {
  try {
    const faculty = getAllFacultyFromDb();
    return NextResponse.json({ success: true, faculty });
  } catch {
    return NextResponse.json({ success: true, faculty: FACULTY_DATA });
  }
}

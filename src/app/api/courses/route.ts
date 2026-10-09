import { NextResponse } from 'next/server';
import { getAllCoursesFromDb } from '@/lib/db/database';
import { COURSE_DATA } from '@/data';

export async function GET() {
  try {
    const courses = getAllCoursesFromDb();
    return NextResponse.json({ success: true, courses });
  } catch {
    return NextResponse.json({ success: true, courses: COURSE_DATA });
  }
}

import { NextResponse } from 'next/server';
import { getAllClassroomsFromDb } from '@/lib/db/database';
import { CLASSROOM_DATA } from '@/data';

export async function GET() {
  try {
    const classrooms = getAllClassroomsFromDb();
    return NextResponse.json({ success: true, classrooms });
  } catch {
    return NextResponse.json({ success: true, classrooms: CLASSROOM_DATA });
  }
}

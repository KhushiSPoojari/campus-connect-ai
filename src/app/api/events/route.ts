import { NextRequest, NextResponse } from 'next/server';
import { extractedCircularSchema } from '@/lib/gemini/schema';
import { requireAdmin } from '@/lib/auth/server-auth';
import {
  getAllNoticesFromDb,
  insertNoticeIntoDb,
  findNoticeByTitleAndDate,
} from '@/lib/db/database';
import type { CampusEvent } from '@/types/event';

export async function GET() {
  try {
    const events = getAllNoticesFromDb();
    return NextResponse.json({
      success: true,
      events,
      count: events.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json(
      { success: false, error: `Failed to fetch notices: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAdmin(request);
    if ('errorResponse' in authResult) {
      return authResult.errorResponse;
    }

    const body = await request.json();

    // Validate using Zod schema
    const validation = extractedCircularSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check for duplicate notice submissions (same title and date)
    const existing = findNoticeByTitleAndDate(data.eventTitle, data.date);
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `A notice titled "${data.eventTitle}" for date "${data.date}" is already published.`,
          existingEventId: existing.id,
        },
        { status: 409 }
      );
    }

    const newEvent: CampusEvent = {
      id: body.id || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: data.eventTitle,
      date: data.date,
      time: data.time || '',
      venue: data.venue,
      coordinator: data.coordinator,
      category: data.category,
      summary: data.summary,
      targetAudience: data.targetAudience,
      source: body.source || 'Gemini Extracted',
      rawDocumentName: body.rawDocumentName,
      status: 'Published',
      createdAt: new Date().toISOString(),
    };

    // Centrally persist in SQLite
    insertNoticeIntoDb(newEvent);

    return NextResponse.json(
      {
        success: true,
        event: newEvent,
        message: 'Event published successfully',
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to process event: ${message}` },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server-auth';
import { getAdminStatsFromDb } from '@/lib/db/database';

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const stats = getAdminStatsFromDb();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve administrative statistics.';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { revokeSession } from '@/lib/auth/auth-service';
import { getSessionTokenFromRequest, clearSessionCookie } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request);
    if (token) {
      revokeSession(token);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
    });

    clearSessionCookie(response);

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Logout error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

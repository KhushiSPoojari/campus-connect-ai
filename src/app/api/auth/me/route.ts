import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth/server-auth';

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);

  if (!user) {
    return NextResponse.json({
      success: false,
      authenticated: false,
      user: null,
    });
  }

  return NextResponse.json({
    success: true,
    authenticated: true,
    user,
  });
}

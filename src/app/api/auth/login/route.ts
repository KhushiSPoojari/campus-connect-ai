import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSession, loginSchema } from '@/lib/auth/auth-service';
import { setSessionCookie } from '@/lib/auth/server-auth';
import { checkRateLimit, getClientIdentifier, isRateLimitEnabled } from '@/lib/auth/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    if (isRateLimitEnabled(request)) {
      const clientId = getClientIdentifier(request, 'login');
      const rateLimit = checkRateLimit(clientId, 5, 15 * 60 * 1000);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'Too many login attempts. Please try again later.',
            retryAfter: rateLimit.retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(rateLimit.retryAfterSeconds),
            },
          }
        );
      }
    }

    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input. Please provide a valid email and password.',
        },
        { status: 400 }
      );
    }

    const user = authenticateUser(validation.data);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid credentials. Please verify your email and password.',
        },
        { status: 401 }
      );
    }

    const { sessionToken, expiresAt } = createSession(user.id);

    const response = NextResponse.json({
      success: true,
      user,
      message: 'Authentication successful.',
    });

    setSessionCookie(response, sessionToken, expiresAt);

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Authentication service error';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

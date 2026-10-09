import { NextRequest, NextResponse } from 'next/server';
import { registerStudent, createSession, studentRegistrationSchema } from '@/lib/auth/auth-service';
import { setSessionCookie } from '@/lib/auth/server-auth';
import { checkRateLimit, getClientIdentifier, isRateLimitEnabled } from '@/lib/auth/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    if (isRateLimitEnabled(request)) {
      const clientId = getClientIdentifier(request, 'register');
      const rateLimit = checkRateLimit(clientId, 5, 15 * 60 * 1000);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'Too many registration attempts. Please try again later.',
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

    // Check for explicit role escalation attempts
    if (body.role && body.role !== 'student') {
      return NextResponse.json(
        {
          success: false,
          error: 'Role escalation rejected. Public registration is restricted to students only.',
        },
        { status: 403 }
      );
    }

    const validation = studentRegistrationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        },
        { status: 400 }
      );
    }

    const user = registerStudent(validation.data, body.role);
    const { sessionToken, expiresAt } = createSession(user.id);

    const response = NextResponse.json(
      {
        success: true,
        user,
        message: 'Student account registered and authenticated successfully.',
      },
      { status: 201 }
    );

    setSessionCookie(response, sessionToken, expiresAt);

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}

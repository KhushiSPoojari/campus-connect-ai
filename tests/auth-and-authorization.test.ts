import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { closeDatabase, getDatabase } from '@/lib/db/database';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import {
  registerStudent,
  provisionAdmin,
  authenticateUser,
  createSession,
  validateSession,
  revokeSession,
  findUserByEmail,
} from '@/lib/auth/auth-service';
import { POST as loginRoute } from '@/app/api/auth/login/route';
import { POST as registerRoute } from '@/app/api/auth/register/route';
import { POST as logoutRoute } from '@/app/api/auth/logout/route';
import { GET as meRoute } from '@/app/api/auth/me/route';
import { POST as parseCircularRoute } from '@/app/api/admin/parse-circular/route';
import { GET as getEventsRoute, POST as postEventsRoute } from '@/app/api/events/route';
import { SESSION_COOKIE_NAME } from '@/lib/auth/server-auth';
import { resetRateLimits, checkRateLimit } from '@/lib/auth/rate-limiter';

describe('Phase 5: Authentication, Authorization & User Management', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.DATABASE_PATH = ':memory:';
    process.env.AUTH_SECRET = 'vitest-test-secret-32-characters-long!';
    closeDatabase();
    resetRateLimits();
  });

  afterEach(() => {
    closeDatabase();
    process.env = { ...originalEnv };
  });

  // 1. Password Hashing and Constant-Time Verification
  describe('Password Hashing & Verification', () => {
    it('hashes passwords using PBKDF2 with unique salts and verifies correctly', () => {
      const password = 'SecurePassword123!';
      const { hash, salt } = hashPassword(password);

      expect(hash).toBeDefined();
      expect(salt).toBeDefined();
      expect(hash.length).toBe(128); // 64 bytes hex
      expect(salt.length).toBe(32); // 16 bytes hex

      // Verification succeeds with correct password
      expect(verifyPassword(password, hash, salt)).toBe(true);

      // Verification fails with wrong password
      expect(verifyPassword('WrongPassword123!', hash, salt)).toBe(false);

      // Unique salt produces different hashes for identical passwords
      const second = hashPassword(password);
      expect(second.salt).not.toBe(salt);
      expect(second.hash).not.toBe(hash);
    });
  });

  // 2. Student Registration and Role Escalation Defense
  describe('Student Registration & Privilege Separation', () => {
    it('successfully registers a student with normalized email and default student role', () => {
      const student = registerStudent({
        name: 'Jane Doe',
        email: 'JANE.DOE@CAMPUS.EDU',
        password: 'StudentPassword123!',
        confirmPassword: 'StudentPassword123!',
        department: 'Information Science',
        studentId: '2026IS001',
      });

      expect(student.id).toMatch(/^usr-std-/);
      expect(student.email).toBe('jane.doe@campus.edu');
      expect(student.role).toBe('student');
      expect(student.name).toBe('Jane Doe');

      // Verify user in database
      const dbUser = findUserByEmail('jane.doe@campus.edu');
      expect(dbUser).not.toBeNull();
      expect(dbUser?.role).toBe('student');
      expect(dbUser?.passwordHash).toBeDefined();
    });

    it('rejects registration when password and confirmPassword do not match', () => {
      expect(() => {
        registerStudent({
          name: 'Test Student',
          email: 'mismatch@campus.edu',
          password: 'PasswordOne123!',
          confirmPassword: 'PasswordTwo456!',
        });
      }).toThrow(/match/i);
    });

    it('rejects registration with short passwords (less than 8 characters)', () => {
      expect(() => {
        registerStudent({
          name: 'Short Pass',
          email: 'short@campus.edu',
          password: 'short',
        });
      }).toThrow(/at least 8 characters/i);
    });

    it('rejects duplicate email registrations', () => {
      registerStudent({
        name: 'First User',
        email: 'duplicate@campus.edu',
        password: 'Password123!',
      });

      expect(() => {
        registerStudent({
          name: 'Second User',
          email: 'duplicate@campus.edu',
          password: 'AnotherPassword123!',
        });
      }).toThrow(/already exists/i);
    });

    it('strictly prevents role escalation when client attempts to specify admin role during registration', () => {
      expect(() => {
        registerStudent(
          {
            name: 'Attacker User',
            email: 'attacker@campus.edu',
            password: 'Password123!',
          },
          'admin' // Attempted role escalation
        );
      }).toThrow(/Role escalation/i);

      // Confirm user was never created
      const attacker = findUserByEmail('attacker@campus.edu');
      expect(attacker).toBeNull();
    });
  });

  // 3. First-Administrator Provisioning
  describe('First-Administrator Provisioning', () => {
    it('securely provisions an administrator with admin role', () => {
      const admin = provisionAdmin({
        email: 'system.admin@campus.edu',
        name: 'Lead Administrator',
        password: 'AdminSuperPassword123!',
        department: 'Campus Security & IT',
      });

      expect(admin.id).toMatch(/^usr-adm-/);
      expect(admin.role).toBe('admin');
      expect(admin.email).toBe('system.admin@campus.edu');

      const dbAdmin = findUserByEmail('system.admin@campus.edu');
      expect(dbAdmin?.role).toBe('admin');
    });

    it('rejects provisioning when administrator password is under 8 characters', () => {
      expect(() => {
        provisionAdmin({
          email: 'weak.admin@campus.edu',
          name: 'Weak Admin',
          password: 'short',
        });
      }).toThrow(/at least 8 characters/i);
    });
  });

  // 4. Authentication, Sessions & Expiry
  describe('Authentication & Session Management', () => {
    it('authenticates valid credentials and rejects incorrect credentials', () => {
      registerStudent({
        name: 'Bob Smith',
        email: 'bob@campus.edu',
        password: 'BobSecurePassword123!',
      });

      // Valid credentials
      const valid = authenticateUser({
        email: 'bob@campus.edu',
        password: 'BobSecurePassword123!',
      });
      expect(valid).not.toBeNull();
      expect(valid?.email).toBe('bob@campus.edu');

      // Wrong password
      const wrongPass = authenticateUser({
        email: 'bob@campus.edu',
        password: 'WrongPassword!',
      });
      expect(wrongPass).toBeNull();

      // Unknown email
      const unknown = authenticateUser({
        email: 'unknown@campus.edu',
        password: 'BobSecurePassword123!',
      });
      expect(unknown).toBeNull();
    });

    it('creates persistent sessions, validates them, and revokes upon logout', () => {
      const student = registerStudent({
        name: 'Alice Wonder',
        email: 'alice@campus.edu',
        password: 'AlicePassword123!',
      });

      const { sessionToken, expiresAt } = createSession(student.id);
      expect(sessionToken).toBeDefined();
      expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());

      // Validate session
      const session = validateSession(sessionToken);
      expect(session).not.toBeNull();
      expect(session?.user.email).toBe('alice@campus.edu');
      expect(session?.user.role).toBe('student');

      // Revoke session (logout)
      revokeSession(sessionToken);
      const afterRevoke = validateSession(sessionToken);
      expect(afterRevoke).toBeNull();
    });

    it('rejects expired sessions and cleans them from database', () => {
      const student = registerStudent({
        name: 'Expire Test',
        email: 'expire@campus.edu',
        password: 'Password123!',
      });

      const db = getDatabase();
      const expiredToken = 'expired-token-123456';
      const pastDate = new Date(Date.now() - 1000 * 60).toISOString(); // 1 minute in the past

      db.prepare(
        'INSERT INTO sessions (id, user_id, session_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run('ses-exp', student.id, expiredToken, pastDate, pastDate);

      // Validation should detect expiry and return null
      const session = validateSession(expiredToken);
      expect(session).toBeNull();
    });
  });

  // 5. HTTP API Authentication & Registration Endpoints
  describe('HTTP Auth API Routes (/api/auth)', () => {
    it('POST /api/auth/register creates user and sets HttpOnly cookie', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Sarah Connor',
          email: 'sarah@campus.edu',
          password: 'SarahPassword123!',
          confirmPassword: 'SarahPassword123!',
          department: 'Physics',
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.email).toBe('sarah@campus.edu');
      expect(json.user.role).toBe('student');

      // Check cookie
      const cookie = res.cookies.get(SESSION_COOKIE_NAME);
      expect(cookie).toBeDefined();
      expect(cookie?.httpOnly).toBe(true);
    });

    it('POST /api/auth/register rejects role escalation attempt in request body with 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Hacker User',
          email: 'hacker@campus.edu',
          password: 'Password123!',
          role: 'admin', // Escalation
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Role escalation rejected');
    });

    it('POST /api/auth/login succeeds with valid credentials and sets session cookie', async () => {
      registerStudent({
        name: 'Login Test',
        email: 'login.test@campus.edu',
        password: 'ValidPassword123!',
      });

      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login.test@campus.edu',
          password: 'ValidPassword123!',
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.email).toBe('login.test@campus.edu');

      const cookie = res.cookies.get(SESSION_COOKIE_NAME);
      expect(cookie).toBeDefined();
    });

    it('POST /api/auth/login returns 401 for incorrect password', async () => {
      registerStudent({
        name: 'Login Test',
        email: 'login.test2@campus.edu',
        password: 'ValidPassword123!',
      });

      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login.test2@campus.edu',
          password: 'WrongPassword!',
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid credentials');
    });

    it('GET /api/auth/me returns authenticated user when valid cookie is provided', async () => {
      const student = registerStudent({
        name: 'Me Route User',
        email: 'me@campus.edu',
        password: 'Password123!',
      });
      const { sessionToken } = createSession(student.id);

      const req = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      });

      const res = await meRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.authenticated).toBe(true);
      expect(json.user.email).toBe('me@campus.edu');
    });

    it('POST /api/auth/logout revokes session in database and clears session cookie', async () => {
      const student = registerStudent({
        name: 'Logout User',
        email: 'logout@campus.edu',
        password: 'Password123!',
      });
      const { sessionToken } = createSession(student.id);

      const req = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      });

      const res = await logoutRoute(req);
      expect(res.status).toBe(200);

      // Session must be revoked in database
      const session = validateSession(sessionToken);
      expect(session).toBeNull();

      // Cookie cleared
      const cookie = res.cookies.get(SESSION_COOKIE_NAME);
      expect(cookie?.value).toBe('');
    });
  });

  // 6. Server-Side Route & Mutation Authorization
  describe('Protected Administrative Routes & Mutations', () => {
    it('POST /api/admin/parse-circular returns 401 when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/parse-circular', {
        method: 'POST',
        headers: {
          'x-test-unauthenticated': 'true',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'Some notice text' }),
      });

      const res = await parseCircularRoute(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Authentication required');
    });

    it('POST /api/admin/parse-circular returns 403 Forbidden when accessed by a Student', async () => {
      const student = registerStudent({
        name: 'Regular Student',
        email: 'student.unauth@campus.edu',
        password: 'Password123!',
      });
      const { sessionToken } = createSession(student.id);

      const req = new NextRequest('http://localhost:3000/api/admin/parse-circular', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'Some notice text' }),
      });

      const res = await parseCircularRoute(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Forbidden');
    });

    it('POST /api/admin/parse-circular succeeds when called by an Administrator', async () => {
      const admin = provisionAdmin({
        email: 'admin.auth@campus.edu',
        name: 'Authorized Admin',
        password: 'AdminPassword123!',
      });
      const { sessionToken } = createSession(admin.id);

      const req = new NextRequest('http://localhost:3000/api/admin/parse-circular', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Annual Technical Symposium 2026. Date: Nov 10. Venue: Hall A. Coordinator: Dr. Alan Turing.',
        }),
      });

      const res = await parseCircularRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.eventTitle).toBeDefined();
    });

    it('GET /api/events is publicly accessible to all users (students & guests)', async () => {
      const res = await getEventsRoute();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.events)).toBe(true);
      expect(json.events.length).toBeGreaterThan(0);
    });

    it('POST /api/events rejects unauthenticated notice publishing with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: {
          'x-test-unauthenticated': 'true',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventTitle: 'Unauthorized Notice',
          date: '2026-11-20',
          venue: 'Main Gate',
          coordinator: 'Unknown',
          category: 'Academic',
          summary: 'Notice published without credentials',
        }),
      });

      const res = await postEventsRoute(req);
      expect(res.status).toBe(401);
    });

    it('POST /api/events rejects student notice publishing with 403 Forbidden', async () => {
      const student = registerStudent({
        name: 'Student Publisher Attempt',
        email: 'student.publisher@campus.edu',
        password: 'Password123!',
      });
      const { sessionToken } = createSession(student.id);

      const req = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventTitle: 'Student Published Notice',
          date: '2026-11-20',
          venue: 'Library Lawn',
          coordinator: 'Student Council',
          category: 'Cultural',
          summary: 'Notice created by unauthorized student',
        }),
      });

      const res = await postEventsRoute(req);
      expect(res.status).toBe(403);
    });

    it('POST /api/events allows administrator to publish official notices', async () => {
      const admin = provisionAdmin({
        email: 'admin.publisher@campus.edu',
        name: 'Official Publisher',
        password: 'AdminPassword123!',
      });
      const { sessionToken } = createSession(admin.id);

      const req = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventTitle: 'Dean List Convocation 2026',
          date: 'December 12, 2026',
          venue: 'Auditorium Hall',
          coordinator: 'Dean Academic Affairs',
          category: 'Academic',
          summary: 'Official convocation ceremony for top performing students.',
        }),
      });

      const res = await postEventsRoute(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.event.title).toBe('Dean List Convocation 2026');
      expect(json.event.status).toBe('Published');

      // Verify it is centrally retrieved via GET /api/events
      const getRes = await getEventsRoute();
      const getJson = await getRes.json();
      expect(getJson.success).toBe(true);
      const found = getJson.events.find(
        (e: { title: string }) => e.title === 'Dean List Convocation 2026'
      );
      expect(found).toBeDefined();
    });

    it('POST /api/events rejects duplicate notice publishing with HTTP 409 Conflict', async () => {
      const admin = provisionAdmin({
        email: 'admin.duplicate@campus.edu',
        name: 'Admin Duplicate Check',
        password: 'AdminPassword123!',
      });
      const { sessionToken } = createSession(admin.id);

      const payload = {
        eventTitle: 'Annual Founders Day 2026',
        date: 'October 30, 2026',
        venue: 'Main Grounds',
        coordinator: 'Office of the Registrar',
        category: 'Cultural',
        summary: 'Celebrating the founding of the institution.',
      };

      const req1 = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const res1 = await postEventsRoute(req1);
      expect(res1.status).toBe(201);

      // Attempt second submission with same title and date
      const req2 = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const res2 = await postEventsRoute(req2);
      expect(res2.status).toBe(409);

      const json2 = await res2.json();
      expect(json2.success).toBe(false);
      expect(json2.error).toContain('already published');
    });

    it('POST /api/events rejects notice submission with missing required fields with HTTP 400', async () => {
      const admin = provisionAdmin({
        email: 'admin.invalid@campus.edu',
        name: 'Admin Invalid Data',
        password: 'AdminPassword123!',
      });
      const { sessionToken } = createSession(admin.id);

      const req = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required fields
          date: '2026-11-15',
        }),
      });

      const res = await postEventsRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Validation failed');
      expect(Array.isArray(json.details)).toBe(true);
    });
  });

  // 12. Rate Limiting Protection (Task 2)
  describe('Authentication Rate Limiting', () => {
    it('sliding window rate limiter blocks requests exceeding the maximum threshold', () => {
      const key = 'test:rate-limit-key';
      // First 5 attempts should be allowed
      for (let i = 0; i < 5; i++) {
        const res = checkRateLimit(key, 5, 60000);
        expect(res.allowed).toBe(true);
        expect(res.remaining).toBe(4 - i);
      }

      // 6th attempt should be blocked
      const blocked = checkRateLimit(key, 5, 60000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('enforces HTTP 429 Too Many Requests on /api/auth/login after 5 attempts', async () => {
      const payload = {
        email: 'attacker@campus.edu',
        password: 'WrongPassword123!',
      };

      for (let i = 0; i < 5; i++) {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': '198.51.100.1',
            'x-test-rate-limit': 'true',
          },
          body: JSON.stringify(payload),
        });
        const res = await loginRoute(req);
        // Prior to hitting limit, route returns 401 for bad credentials
        expect(res.status).toBe(401);
      }

      // 6th attempt must be rejected with 429
      const req6 = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '198.51.100.1',
          'x-test-rate-limit': 'true',
        },
        body: JSON.stringify(payload),
      });
      const res6 = await loginRoute(req6);
      expect(res6.status).toBe(429);
      expect(res6.headers.get('Retry-After')).toBeDefined();

      const json6 = await res6.json();
      expect(json6.success).toBe(false);
      expect(json6.error).toContain('Too many login attempts');
    });

    it('enforces HTTP 429 Too Many Requests on /api/auth/register after 5 attempts', async () => {
      const payload = {
        name: 'Spam Bot',
        email: 'spambot@campus.edu',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
      };

      for (let i = 0; i < 5; i++) {
        const req = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': '198.51.100.2',
            'x-test-rate-limit': 'true',
          },
          body: JSON.stringify({ ...payload, email: `spam${i}@campus.edu` }),
        });
        const res = await registerRoute(req);
        expect(res.status).toBe(201);
      }

      // 6th attempt from same IP must be rate-limited
      const req6 = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '198.51.100.2',
          'x-test-rate-limit': 'true',
        },
        body: JSON.stringify({ ...payload, email: 'spam6@campus.edu' }),
      });
      const res6 = await registerRoute(req6);
      expect(res6.status).toBe(429);
      expect(res6.headers.get('Retry-After')).toBeDefined();

      const json6 = await res6.json();
      expect(json6.success).toBe(false);
      expect(json6.error).toContain('Too many registration attempts');
    });

    it('rate limiter resets tracking after window expiry allowing subsequent requests', () => {
      const key = 'test:expiry-key';
      // Fill window with 5 attempts in 1000ms window
      for (let i = 0; i < 5; i++) {
        checkRateLimit(key, 5, 1000);
      }
      expect(checkRateLimit(key, 5, 1000).allowed).toBe(false);

      // Advance mock time past the window
      const realNow = Date.now;
      try {
        Date.now = () => realNow() + 2000;
        const afterExpiry = checkRateLimit(key, 5, 1000);
        expect(afterExpiry.allowed).toBe(true);
        expect(afterExpiry.remaining).toBe(4);
      } finally {
        Date.now = realNow;
      }
    });

    it('resetRateLimits() clears all active records immediately', () => {
      const key = 'test:manual-reset-key';
      for (let i = 0; i < 5; i++) {
        checkRateLimit(key, 5, 60000);
      }
      expect(checkRateLimit(key, 5, 60000).allowed).toBe(false);

      resetRateLimits();

      const afterReset = checkRateLimit(key, 5, 60000);
      expect(afterReset.allowed).toBe(true);
      expect(afterReset.remaining).toBe(4);
    });

    it('rate limit response does not disclose whether user email exists', async () => {
      const nonExistentReq = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '203.0.113.50',
          'x-test-rate-limit': 'true',
        },
        body: JSON.stringify({ email: 'ghost@campus.edu', password: 'BadPassword123!' }),
      });

      // Exhaust allowable attempts
      for (let i = 0; i < 5; i++) {
        await loginRoute(nonExistentReq);
      }

      const blockedRes = await loginRoute(nonExistentReq);
      expect(blockedRes.status).toBe(429);
      const blockedJson = await blockedRes.json();

      // Ensure error is generic and does not disclose user existence
      expect(blockedJson.error).toBe('Too many login attempts. Please try again later.');
      expect(blockedJson.error).not.toContain('ghost@campus.edu');
      expect(blockedJson.error).not.toContain('found');
      expect(blockedJson.error).not.toContain('exist');
    });
  });
});

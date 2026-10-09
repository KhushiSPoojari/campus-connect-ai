import crypto from 'node:crypto';
import { z } from 'zod';
import { getDatabase } from '@/lib/db/database';
import { hashPassword, verifyPassword } from './password';
import type {
  User,
  UserRecord,
  AuthSession,
  LoginInput,
  RegisterStudentInput,
  UserRole,
} from '@/types/auth';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Ensures a secure AUTH_SECRET is configured.
 * Does not permit weak or empty fallback secrets.
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.trim().length < 16) {
    if (process.env.NODE_ENV === 'test') {
      return 'vitest-test-secret-at-least-32-chars-long!';
    }
    throw new Error(
      'FATAL: Insecure environment configuration. AUTH_SECRET is required and must be at least 16 characters long. Set AUTH_SECRET in your environment or .env.local file.'
    );
  }
  return secret.trim();
}

// Zod validation schemas
export const studentRegistrationSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    email: z
      .string()
      .email('Invalid email address')
      .max(150, 'Email cannot exceed 150 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters'),
    confirmPassword: z.string().optional(),
    department: z.string().max(100).optional(),
    studentId: z.string().max(50).optional(),
  })
  .refine(
    (data) => !data.confirmPassword || data.password === data.confirmPassword,
    {
      message: 'Password and confirm password do not match',
      path: ['confirmPassword'],
    }
  );

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

interface DbUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string | null;
  student_id: string | null;
  password_hash: string;
  salt: string;
  created_at: string;
}

function rowToUserRecord(row: DbUserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as UserRole,
    department: row.department ?? undefined,
    studentId: row.student_id ?? undefined,
    passwordHash: row.password_hash,
    salt: row.salt,
    createdAt: row.created_at,
  };
}

function sanitizeUser(user: UserRecord): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
    studentId: user.studentId,
    createdAt: user.createdAt,
  };
}

/**
 * Finds a user by email (case-insensitive).
 */
export function findUserByEmail(email: string): UserRecord | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE LIMIT 1');
  const row = stmt.get(email.trim().toLowerCase()) as DbUserRow | undefined;
  return row ? rowToUserRecord(row) : null;
}

/**
 * Finds a user by ID.
 */
export function findUserById(id: string): User | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
  const row = stmt.get(id) as DbUserRow | undefined;
  return row ? sanitizeUser(rowToUserRecord(row)) : null;
}

/**
 * Counts the total number of registered administrator accounts.
 */
export function countAdmins(): number {
  const db = getDatabase();
  const stmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
  const result = stmt.get() as { count: number } | undefined;
  return result?.count ?? 0;
}

/**
 * Registers a new student account.
 * Explicitly rejects any attempt to register an admin account or escalate privileges.
 */
export function registerStudent(
  rawInput: RegisterStudentInput,
  requestedRole?: unknown
): User {
  // Prevent role escalation at the server boundary
  if (requestedRole && requestedRole !== 'student') {
    throw new Error('Role escalation rejected: Public registration is restricted to students only.');
  }

  const validated = studentRegistrationSchema.parse(rawInput);
  const normalizedEmail = validated.email.trim().toLowerCase();

  const existing = findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  const { hash, salt } = hashPassword(validated.password);
  const userId = `usr-std-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO users (id, email, name, role, department, student_id, password_hash, salt, created_at)
    VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?)
  `);

  stmt.run(
    userId,
    normalizedEmail,
    validated.name.trim(),
    validated.department?.trim() || null,
    validated.studentId?.trim() || null,
    hash,
    salt,
    now
  );

  return {
    id: userId,
    email: normalizedEmail,
    name: validated.name.trim(),
    role: 'student',
    department: validated.department?.trim(),
    studentId: validated.studentId?.trim(),
    createdAt: now,
  };
}

/**
 * Securely provisions an administrator account.
 * Restricted to CLI execution or authorized first-run setup.
 */
export function provisionAdmin(params: {
  email: string;
  name: string;
  password: string;
  department?: string;
}): User {
  const normalizedEmail = params.email.trim().toLowerCase();

  if (params.password.length < 8) {
    throw new Error('Admin password must be at least 8 characters long.');
  }

  const existing = findUserByEmail(normalizedEmail);
  if (existing) {
    if (existing.role === 'admin') {
      throw new Error(`Admin account for ${normalizedEmail} already exists.`);
    }
    throw new Error(`Email ${normalizedEmail} is already registered as a student.`);
  }

  const { hash, salt } = hashPassword(params.password);
  const adminId = `usr-adm-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO users (id, email, name, role, department, student_id, password_hash, salt, created_at)
    VALUES (?, ?, ?, 'admin', ?, NULL, ?, ?, ?)
  `);

  stmt.run(
    adminId,
    normalizedEmail,
    params.name.trim(),
    params.department?.trim() || null,
    hash,
    salt,
    now
  );

  return {
    id: adminId,
    email: normalizedEmail,
    name: params.name.trim(),
    role: 'admin',
    department: params.department?.trim(),
    createdAt: now,
  };
}

/**
 * Authenticates user credentials against the persistent database.
 */
export function authenticateUser(credentials: LoginInput): User | null {
  const validated = loginSchema.safeParse(credentials);
  if (!validated.success) {
    return null;
  }

  const user = findUserByEmail(validated.data.email);
  if (!user) {
    return null;
  }

  const isValid = verifyPassword(validated.data.password, user.passwordHash, user.salt);
  if (!isValid) {
    return null;
  }

  return sanitizeUser(user);
}

/**
 * Creates a server-managed session in the database.
 */
export function createSession(userId: string): { sessionToken: string; expiresAt: string } {
  const db = getDatabase();
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionId = `ses-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, session_token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(sessionId, userId, sessionToken, expiresAt, now);

  return { sessionToken, expiresAt };
}

interface DbSessionJoinRow {
  session_token: string;
  expires_at: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
  department: string | null;
  student_id: string | null;
  created_at: string;
}

/**
 * Validates a session token and returns the authenticated user session.
 * Automatically cleans up expired sessions.
 */
export function validateSession(sessionToken: string): AuthSession | null {
  if (!sessionToken || sessionToken.trim() === '') {
    return null;
  }

  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT s.session_token, s.expires_at,
           u.id as user_id, u.email, u.name, u.role, u.department, u.student_id, u.created_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.session_token = ?
    LIMIT 1
  `);

  const row = stmt.get(sessionToken.trim()) as DbSessionJoinRow | undefined;
  if (!row) {
    return null;
  }

  // Check expiration
  if (new Date(row.expires_at).getTime() < Date.now()) {
    revokeSession(sessionToken);
    return null;
  }

  return {
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
      role: row.role as UserRole,
      department: row.department ?? undefined,
      studentId: row.student_id ?? undefined,
      createdAt: row.created_at,
    },
    expiresAt: row.expires_at,
  };
}

/**
 * Revokes a session token from the database.
 */
export function revokeSession(sessionToken: string): void {
  if (!sessionToken) return;
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM sessions WHERE session_token = ?');
  stmt.run(sessionToken);
}

/**
 * Revokes all sessions for a user (e.g. security reset).
 */
export function revokeAllUserSessions(userId: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');
  stmt.run(userId);
}

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { INITIAL_EVENTS, CLASSROOM_DATA, FACULTY_DATA, COURSE_DATA } from '@/data';
import type { CampusEvent } from '@/types/event';
import type { Classroom } from '@/types/classroom';
import type { FacultyMember } from '@/types/faculty';
import type { Course } from '@/types/course';
import type { User } from '@/types/auth';
import { hashPassword } from '@/lib/auth/password';

let instance: DatabaseSync | null = null;

export interface DbNoticeRow {
  id: string;
  title: string;
  date: string;
  time: string | null;
  venue: string;
  coordinator: string;
  category: string;
  summary: string;
  source: string;
  raw_document_name: string | null;
  target_audience: string | null;
  status: string;
  created_at: string;
}

export interface DbClassroomRow {
  id: string;
  room_number: string;
  building_id: string;
  building_name: string;
  floor: number;
  wing: string;
  capacity: number;
  type: string;
  amenities: string;
  weekly_schedule: string;
}

export interface DbFacultyRow {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  office: string;
  subjects: string;
  bio: string | null;
  weekly_schedule: string;
}

export interface DbCourseRow {
  code: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  assigned_lecturer_id: string;
  assigned_lecturer_name: string;
  lecture_room: string;
  schedule_summary: string;
  syllabus_summary: string;
}

export interface AdminStats {
  totalStudents: number;
  totalFaculty: number;
  totalClassrooms: number;
  totalCourses: number;
  totalNotices: number;
  totalAdmins: number;
}

function rowToCampusEvent(row: DbNoticeRow): CampusEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    time: row.time ?? undefined,
    venue: row.venue,
    coordinator: row.coordinator,
    category: row.category as CampusEvent['category'],
    summary: row.summary,
    source: row.source as CampusEvent['source'],
    rawDocumentName: row.raw_document_name ?? undefined,
    targetAudience: row.target_audience ?? undefined,
    status: row.status as CampusEvent['status'],
    createdAt: row.created_at,
  };
}

function rowToClassroom(row: DbClassroomRow): Classroom {
  return {
    id: row.id,
    roomNumber: row.room_number,
    buildingId: row.building_id,
    buildingName: row.building_name,
    floor: row.floor,
    wing: row.wing as Classroom['wing'],
    capacity: row.capacity,
    type: row.type as Classroom['type'],
    amenities: JSON.parse(row.amenities || '[]'),
    weeklySchedule: JSON.parse(row.weekly_schedule || '{}'),
  };
}

function rowToFaculty(row: DbFacultyRow): FacultyMember {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    department: row.department,
    email: row.email,
    phone: row.phone,
    office: JSON.parse(row.office || '{}'),
    subjects: JSON.parse(row.subjects || '[]'),
    bio: row.bio ?? undefined,
    weeklySchedule: JSON.parse(row.weekly_schedule || '{}'),
  };
}

function rowToCourse(row: DbCourseRow): Course {
  return {
    code: row.code,
    name: row.name,
    department: row.department,
    semester: row.semester,
    credits: row.credits,
    assignedLecturerId: row.assigned_lecturer_id,
    assignedLecturerName: row.assigned_lecturer_name,
    lectureRoom: row.lecture_room,
    scheduleSummary: row.schedule_summary,
    syllabusSummary: row.syllabus_summary,
  };
}

/**
 * Returns the singleton SQLite database connection.
 * If in a test environment with DATABASE_PATH=':memory:', creates an in-memory database.
 */
export function getDatabase(): DatabaseSync {
  if (instance) {
    return instance;
  }

  const dbPath =
    process.env.DATABASE_PATH ||
    path.join(process.cwd(), 'data', 'campus-connect.db');

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);

  // Enable foreign keys and WAL journal mode for performance and safety
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }

  // Initialize schema
  initializeSchema(db);

  instance = db;
  return instance;
}

function seedInitialNoticesIfEmpty(db: DatabaseSync): void {
  try {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM notices').get() as
      | { count: number }
      | undefined;

    if (!countRow || countRow.count === 0) {
      const insert = db.prepare(`
        INSERT OR IGNORE INTO notices (id, title, date, time, venue, coordinator, category, summary, source, raw_document_name, target_audience, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const evt of INITIAL_EVENTS) {
        insert.run(
          evt.id,
          evt.title,
          evt.date,
          evt.time ?? null,
          evt.venue,
          evt.coordinator,
          evt.category,
          evt.summary,
          evt.source,
          evt.rawDocumentName ?? null,
          evt.targetAudience ?? null,
          evt.status,
          evt.createdAt || new Date().toISOString()
        );
      }
    }
  } catch (err) {
    console.warn('Warning: Failed to seed initial notices in SQLite:', err);
  }
}

function seedInitialClassroomsIfEmpty(db: DatabaseSync): void {
  try {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM classrooms').get() as
      | { count: number }
      | undefined;

    if (!countRow || countRow.count === 0) {
      const insert = db.prepare(`
        INSERT OR IGNORE INTO classrooms (id, room_number, building_id, building_name, floor, wing, capacity, type, amenities, weekly_schedule)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const room of CLASSROOM_DATA) {
        insert.run(
          room.id,
          room.roomNumber,
          room.buildingId,
          room.buildingName,
          room.floor,
          room.wing,
          room.capacity,
          room.type,
          JSON.stringify(room.amenities || []),
          JSON.stringify(room.weeklySchedule || {})
        );
      }
    }
  } catch (err) {
    console.warn('Warning: Failed to seed initial classrooms in SQLite:', err);
  }
}

function seedInitialFacultyIfEmpty(db: DatabaseSync): void {
  try {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM faculty').get() as
      | { count: number }
      | undefined;

    if (!countRow || countRow.count === 0) {
      const insert = db.prepare(`
        INSERT OR IGNORE INTO faculty (id, name, title, department, email, phone, office, subjects, bio, weekly_schedule)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const fac of FACULTY_DATA) {
        insert.run(
          fac.id,
          fac.name,
          fac.title,
          fac.department,
          fac.email,
          fac.phone,
          JSON.stringify(fac.office || {}),
          JSON.stringify(fac.subjects || []),
          fac.bio || null,
          JSON.stringify(fac.weeklySchedule || {})
        );
      }
    }
  } catch (err) {
    console.warn('Warning: Failed to seed initial faculty in SQLite:', err);
  }
}

function seedInitialCoursesIfEmpty(db: DatabaseSync): void {
  try {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM courses').get() as
      | { count: number }
      | undefined;

    if (!countRow || countRow.count === 0) {
      const insert = db.prepare(`
        INSERT OR IGNORE INTO courses (code, name, department, semester, credits, assigned_lecturer_id, assigned_lecturer_name, lecture_room, schedule_summary, syllabus_summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const c of COURSE_DATA) {
        insert.run(
          c.code,
          c.name,
          c.department,
          c.semester,
          c.credits,
          c.assignedLecturerId,
          c.assignedLecturerName,
          c.lectureRoom,
          c.scheduleSummary,
          c.syllabusSummary
        );
      }
    }
  } catch (err) {
    console.warn('Warning: Failed to seed initial courses in SQLite:', err);
  }
}

function seedInitialAdminIfEmpty(db: DatabaseSync): void {
  try {
    const countRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as
      | { count: number }
      | undefined;

    if (!countRow || countRow.count === 0) {
      const email = (process.env.ADMIN_INITIAL_EMAIL || 'admin@campus.edu').trim().toLowerCase();
      const password = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@Campus2026!';
      const { hash, salt } = hashPassword(password);
      const adminId = `usr-adm-init-${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();

      const insert = db.prepare(`
        INSERT OR IGNORE INTO users (id, email, name, role, department, student_id, password_hash, salt, created_at)
        VALUES (?, ?, ?, 'admin', ?, NULL, ?, ?, ?)
      `);

      insert.run(
        adminId,
        email,
        'Campus Administrator',
        'Campus IT & Administration',
        hash,
        salt,
        now
      );
    }
  } catch (err) {
    console.warn('Warning: Failed to seed initial admin in SQLite:', err);
  }
}

function seedInitialStudentIfEmpty(db: DatabaseSync): void {
  try {
    const countRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get() as
      | { count: number }
      | undefined;

    if (!countRow || countRow.count === 0) {
      const email = 'student@campus.edu';
      const password = 'Student@Campus2026!';
      const { hash, salt } = hashPassword(password);
      const studentId = `usr-std-init-${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();

      const insert = db.prepare(`
        INSERT OR IGNORE INTO users (id, email, name, role, department, student_id, password_hash, salt, created_at)
        VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?)
      `);

      insert.run(
        studentId,
        email,
        'Alex Kumar',
        'Computer Science & Engineering',
        '2026CS101',
        hash,
        salt,
        now
      );
    }
  } catch (err) {
    console.warn('Warning: Failed to seed initial student in SQLite:', err);
  }
}

function initializeSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'student')),
      department TEXT,
      student_id TEXT,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS notices (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      venue TEXT NOT NULL,
      coordinator TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      source TEXT NOT NULL,
      raw_document_name TEXT,
      target_audience TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notices_created ON notices(created_at);

    CREATE TABLE IF NOT EXISTS classrooms (
      id TEXT PRIMARY KEY,
      room_number TEXT NOT NULL,
      building_id TEXT NOT NULL,
      building_name TEXT NOT NULL,
      floor INTEGER NOT NULL,
      wing TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      type TEXT NOT NULL,
      amenities TEXT NOT NULL,
      weekly_schedule TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_classrooms_room ON classrooms(room_number);

    CREATE TABLE IF NOT EXISTS faculty (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      department TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      office TEXT NOT NULL,
      subjects TEXT NOT NULL,
      bio TEXT,
      weekly_schedule TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_faculty_name ON faculty(name);

    CREATE TABLE IF NOT EXISTS courses (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      semester INTEGER NOT NULL,
      credits INTEGER NOT NULL,
      assigned_lecturer_id TEXT,
      assigned_lecturer_name TEXT,
      lecture_room TEXT NOT NULL,
      schedule_summary TEXT NOT NULL,
      syllabus_summary TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
  `);

  seedInitialNoticesIfEmpty(db);
  seedInitialClassroomsIfEmpty(db);
  seedInitialFacultyIfEmpty(db);
  seedInitialCoursesIfEmpty(db);
  seedInitialAdminIfEmpty(db);
  seedInitialStudentIfEmpty(db);
}

// ================= NOTICE METHODS =================

export function getAllNoticesFromDb(): CampusEvent[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM notices ORDER BY created_at DESC, rowid DESC');
  const rows = stmt.all() as unknown as DbNoticeRow[];
  return rows.map(rowToCampusEvent);
}

export function insertNoticeIntoDb(event: CampusEvent): void {
  const db = getDatabase();
  const insert = db.prepare(`
    INSERT INTO notices (id, title, date, time, venue, coordinator, category, summary, source, raw_document_name, target_audience, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    event.id,
    event.title,
    event.date,
    event.time ?? null,
    event.venue,
    event.coordinator,
    event.category,
    event.summary,
    event.source,
    event.rawDocumentName ?? null,
    event.targetAudience ?? null,
    event.status,
    event.createdAt
  );
}

export function findNoticeByTitleAndDate(title: string, date: string): CampusEvent | null {
  const db = getDatabase();
  const stmt = db.prepare(
    'SELECT * FROM notices WHERE title = ? COLLATE NOCASE AND date = ? COLLATE NOCASE LIMIT 1'
  );
  const row = stmt.get(title.trim(), date.trim()) as DbNoticeRow | undefined;
  return row ? rowToCampusEvent(row) : null;
}

export function deleteNoticeFromDb(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM notices WHERE id = ?');
  const result = stmt.run(id);
  return Number(result.changes) > 0;
}

// ================= STUDENT MANAGEMENT METHODS =================

export function getAllStudentsFromDb(): User[] {
  const db = getDatabase();
  const stmt = db.prepare(
    "SELECT id, email, name, role, department, student_id, created_at FROM users WHERE role = 'student' ORDER BY created_at DESC"
  );
  const rows = stmt.all() as Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    department: string | null;
    student_id: string | null;
    created_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: 'student' as const,
    department: r.department ?? undefined,
    studentId: r.student_id ?? undefined,
    createdAt: r.created_at,
  }));
}

export function deleteStudentFromDb(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM users WHERE id = ? AND role = 'student'");
  const result = stmt.run(id);
  return Number(result.changes) > 0;
}

// ================= CLASSROOM METHODS =================

export function getAllClassroomsFromDb(): Classroom[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM classrooms ORDER BY room_number ASC');
  const rows = stmt.all() as unknown as DbClassroomRow[];
  return rows.map(rowToClassroom);
}

export function getClassroomByIdFromDb(id: string): Classroom | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM classrooms WHERE id = ? LIMIT 1');
  const row = stmt.get(id) as DbClassroomRow | undefined;
  return row ? rowToClassroom(row) : null;
}

export function insertClassroomIntoDb(classroom: Classroom): void {
  const db = getDatabase();
  const insert = db.prepare(`
    INSERT INTO classrooms (id, room_number, building_id, building_name, floor, wing, capacity, type, amenities, weekly_schedule)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run(
    classroom.id,
    classroom.roomNumber,
    classroom.buildingId,
    classroom.buildingName,
    classroom.floor,
    classroom.wing,
    classroom.capacity,
    classroom.type,
    JSON.stringify(classroom.amenities || []),
    JSON.stringify(classroom.weeklySchedule || {})
  );
}

export function updateClassroomInDb(classroom: Classroom): boolean {
  const db = getDatabase();
  const update = db.prepare(`
    UPDATE classrooms
    SET room_number = ?, building_id = ?, building_name = ?, floor = ?, wing = ?, capacity = ?, type = ?, amenities = ?, weekly_schedule = ?
    WHERE id = ?
  `);
  const result = update.run(
    classroom.roomNumber,
    classroom.buildingId,
    classroom.buildingName,
    classroom.floor,
    classroom.wing,
    classroom.capacity,
    classroom.type,
    JSON.stringify(classroom.amenities || []),
    JSON.stringify(classroom.weeklySchedule || {}),
    classroom.id
  );
  return Number(result.changes) > 0;
}

export function deleteClassroomFromDb(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM classrooms WHERE id = ?');
  const result = stmt.run(id);
  return Number(result.changes) > 0;
}

// ================= FACULTY METHODS =================

export function getAllFacultyFromDb(): FacultyMember[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM faculty ORDER BY name ASC');
  const rows = stmt.all() as unknown as DbFacultyRow[];
  return rows.map(rowToFaculty);
}

export function getFacultyByIdFromDb(id: string): FacultyMember | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM faculty WHERE id = ? LIMIT 1');
  const row = stmt.get(id) as DbFacultyRow | undefined;
  return row ? rowToFaculty(row) : null;
}

export function insertFacultyIntoDb(faculty: FacultyMember): void {
  const db = getDatabase();
  const insert = db.prepare(`
    INSERT INTO faculty (id, name, title, department, email, phone, office, subjects, bio, weekly_schedule)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run(
    faculty.id,
    faculty.name,
    faculty.title,
    faculty.department,
    faculty.email,
    faculty.phone,
    JSON.stringify(faculty.office || {}),
    JSON.stringify(faculty.subjects || []),
    faculty.bio || null,
    JSON.stringify(faculty.weeklySchedule || {})
  );
}

export function updateFacultyInDb(faculty: FacultyMember): boolean {
  const db = getDatabase();
  const update = db.prepare(`
    UPDATE faculty
    SET name = ?, title = ?, department = ?, email = ?, phone = ?, office = ?, subjects = ?, bio = ?, weekly_schedule = ?
    WHERE id = ?
  `);
  const result = update.run(
    faculty.name,
    faculty.title,
    faculty.department,
    faculty.email,
    faculty.phone,
    JSON.stringify(faculty.office || {}),
    JSON.stringify(faculty.subjects || []),
    faculty.bio || null,
    JSON.stringify(faculty.weeklySchedule || {}),
    faculty.id
  );
  return Number(result.changes) > 0;
}

export function deleteFacultyFromDb(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM faculty WHERE id = ?');
  const result = stmt.run(id);
  return Number(result.changes) > 0;
}

// ================= COURSE METHODS =================

export function getAllCoursesFromDb(): Course[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM courses ORDER BY code ASC');
  const rows = stmt.all() as unknown as DbCourseRow[];
  return rows.map(rowToCourse);
}

export function getCourseByCodeFromDb(code: string): Course | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM courses WHERE code = ? LIMIT 1');
  const row = stmt.get(code) as DbCourseRow | undefined;
  return row ? rowToCourse(row) : null;
}

export function insertCourseIntoDb(course: Course): void {
  const db = getDatabase();
  const insert = db.prepare(`
    INSERT INTO courses (code, name, department, semester, credits, assigned_lecturer_id, assigned_lecturer_name, lecture_room, schedule_summary, syllabus_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run(
    course.code,
    course.name,
    course.department,
    course.semester,
    course.credits,
    course.assignedLecturerId,
    course.assignedLecturerName,
    course.lectureRoom,
    course.scheduleSummary,
    course.syllabusSummary
  );
}

export function updateCourseInDb(course: Course): boolean {
  const db = getDatabase();
  const update = db.prepare(`
    UPDATE courses
    SET name = ?, department = ?, semester = ?, credits = ?, assigned_lecturer_id = ?, assigned_lecturer_name = ?, lecture_room = ?, schedule_summary = ?, syllabus_summary = ?
    WHERE code = ?
  `);
  const result = update.run(
    course.name,
    course.department,
    course.semester,
    course.credits,
    course.assignedLecturerId,
    course.assignedLecturerName,
    course.lectureRoom,
    course.scheduleSummary,
    course.syllabusSummary,
    course.code
  );
  return Number(result.changes) > 0;
}

export function deleteCourseFromDb(code: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM courses WHERE code = ?');
  const result = stmt.run(code);
  return Number(result.changes) > 0;
}

// ================= STATS METHOD =================

export function getAdminStatsFromDb(): AdminStats {
  const db = getDatabase();
  const studentsCount = (
    db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get() as { count: number }
  )?.count ?? 0;
  const adminsCount = (
    db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number }
  )?.count ?? 0;
  const facultyCount = (
    db.prepare('SELECT COUNT(*) as count FROM faculty').get() as { count: number }
  )?.count ?? 0;
  const classroomsCount = (
    db.prepare('SELECT COUNT(*) as count FROM classrooms').get() as { count: number }
  )?.count ?? 0;
  const coursesCount = (
    db.prepare('SELECT COUNT(*) as count FROM courses').get() as { count: number }
  )?.count ?? 0;
  const noticesCount = (
    db.prepare('SELECT COUNT(*) as count FROM notices').get() as { count: number }
  )?.count ?? 0;

  return {
    totalStudents: studentsCount,
    totalAdmins: adminsCount,
    totalFaculty: facultyCount,
    totalClassrooms: classroomsCount,
    totalCourses: coursesCount,
    totalNotices: noticesCount,
  };
}

/**
 * Closes and resets the singleton instance (primarily for isolated test suites).
 */
export function closeDatabase(): void {
  if (instance) {
    try {
      instance.close();
    } catch {
      // Ignore if already closed
    }
    instance = null;
  }
}

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { INITIAL_EVENTS } from '@/data';
import type { CampusEvent } from '@/types/event';

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
  `);

  seedInitialNoticesIfEmpty(db);
}

/**
 * Retrieves all notices ordered by creation timestamp from SQLite.
 */
export function getAllNoticesFromDb(): CampusEvent[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM notices ORDER BY created_at DESC, rowid DESC');
  const rows = stmt.all() as unknown as DbNoticeRow[];
  return rows.map(rowToCampusEvent);
}

/**
 * Inserts a newly published notice into SQLite.
 */
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

/**
 * Finds a notice by title and date to prevent duplicate submissions.
 */
export function findNoticeByTitleAndDate(title: string, date: string): CampusEvent | null {
  const db = getDatabase();
  const stmt = db.prepare(
    'SELECT * FROM notices WHERE title = ? COLLATE NOCASE AND date = ? COLLATE NOCASE LIMIT 1'
  );
  const row = stmt.get(title.trim(), date.trim()) as DbNoticeRow | undefined;
  return row ? rowToCampusEvent(row) : null;
}

/**
 * Removes a notice by ID from SQLite.
 */
export function deleteNoticeFromDb(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM notices WHERE id = ?');
  const result = stmt.run(id);
  return Number(result.changes) > 0;
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

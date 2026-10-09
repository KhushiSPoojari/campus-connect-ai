#!/usr/bin/env node

/**
 * First-Admin Provisioning Script for Campus Connect AI.
 * Creates an administrator account directly in the persistent SQLite database.
 * 
 * Usage:
 *   node scripts/create-admin.mjs --email admin@campus.edu --name "Campus Administrator" --password "YourStrongPassword123!"
 * Or via environment variables:
 *   ADMIN_EMAIL=admin@campus.edu ADMIN_PASSWORD=YourPassword ADMIN_NAME="Admin" node scripts/create-admin.mjs
 */

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const args = process.argv.slice(2);
function getArg(flag) {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : undefined;
}

const email = getArg('--email') || process.env.ADMIN_EMAIL;
const name = getArg('--name') || process.env.ADMIN_NAME || 'Campus Administrator';
const department = getArg('--department') || process.env.ADMIN_DEPARTMENT || 'Administration';
let password = getArg('--password') || process.env.ADMIN_PASSWORD;

if (!email) {
  console.error('Error: Administrator email is required.');
  console.log('Usage: node scripts/create-admin.mjs --email <email> --name <name> [--password <password>]');
  process.exit(1);
}

let generatedPassword = false;
if (!password) {
  // Generate a cryptographically secure 16-character temporary password
  password = crypto.randomBytes(12).toString('base64url') + '!A1';
  generatedPassword = true;
}

if (password.length < 8) {
  console.error('Error: Administrator password must be at least 8 characters long.');
  process.exit(1);
}

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'campus-connect.db');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Ensure tables exist
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
`);

// Check if user already exists
const checkStmt = db.prepare('SELECT id, email, role FROM users WHERE email = ? COLLATE NOCASE');
const existing = checkStmt.get(email.trim().toLowerCase());

if (existing) {
  console.error(`Error: User with email "${email}" already exists (Role: ${existing.role}).`);
  process.exit(1);
}

// Hash password with PBKDF2 / SHA-512
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto
  .pbkdf2Sync(password, salt, 100_000, 64, 'sha512')
  .toString('hex');

const adminId = `usr-adm-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
const now = new Date().toISOString();

const insertStmt = db.prepare(`
  INSERT INTO users (id, email, name, role, department, student_id, password_hash, salt, created_at)
  VALUES (?, ?, ?, 'admin', ?, NULL, ?, ?, ?)
`);

insertStmt.run(adminId, email.trim().toLowerCase(), name.trim(), department.trim(), hash, salt, now);

console.log('✓ Administrator account provisioned successfully!');
console.log(`  User ID:    ${adminId}`);
console.log(`  Email:      ${email.trim().toLowerCase()}`);
console.log(`  Name:       ${name.trim()}`);
console.log(`  Role:       admin`);
console.log(`  Department: ${department.trim()}`);
if (generatedPassword) {
  console.log(`  Generated Password: ${password}`);
  console.log('  IMPORTANT: Save this password immediately. It will not be shown again.');
} else {
  console.log('  Password:   [Configured securely via parameter]');
}

db.close();

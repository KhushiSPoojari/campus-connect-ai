-- ====================================================================
-- Campus Connect AI — Production PostgreSQL Schema & Migration
-- Compatible with Supabase, Neon, AWS RDS PostgreSQL, and Vercel Postgres
-- ====================================================================

-- 1. Users Table (Role-based authentication & PBKDF2 hashes)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK(role IN ('admin', 'student')),
    department VARCHAR(255),
    student_id VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Sessions Table (Server-side managed HttpOnly sessions)
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(128) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 3. Notices & Circulars Table
CREATE TABLE IF NOT EXISTS notices (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date VARCHAR(64) NOT NULL,
    time VARCHAR(64),
    venue VARCHAR(255) NOT NULL,
    coordinator VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    summary TEXT NOT NULL,
    source VARCHAR(64) NOT NULL,
    raw_document_name VARCHAR(255),
    target_audience VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notices_created ON notices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notices_category ON notices(category);

-- 4. Classrooms Table
CREATE TABLE IF NOT EXISTS classrooms (
    id VARCHAR(64) PRIMARY KEY,
    room_number VARCHAR(32) NOT NULL,
    building_id VARCHAR(64) NOT NULL,
    building_name VARCHAR(255) NOT NULL,
    floor INTEGER NOT NULL DEFAULT 1,
    wing VARCHAR(32) NOT NULL DEFAULT 'Central',
    capacity INTEGER NOT NULL DEFAULT 30,
    type VARCHAR(64) NOT NULL DEFAULT 'Lecture Hall',
    amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
    weekly_schedule JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_classrooms_room ON classrooms(room_number);
CREATE INDEX IF NOT EXISTS idx_classrooms_building ON classrooms(building_id);

-- 5. Faculty Table
CREATE TABLE IF NOT EXISTS faculty (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(128) NOT NULL,
    department VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(64) NOT NULL,
    office JSONB NOT NULL DEFAULT '{}'::jsonb,
    subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
    bio TEXT,
    weekly_schedule JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_faculty_name ON faculty(name);
CREATE INDEX IF NOT EXISTS idx_faculty_dept ON faculty(department);

-- 6. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    code VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    semester INTEGER NOT NULL DEFAULT 1,
    credits INTEGER NOT NULL DEFAULT 3,
    assigned_lecturer_id VARCHAR(64),
    assigned_lecturer_name VARCHAR(255),
    lecture_room VARCHAR(64) NOT NULL,
    schedule_summary VARCHAR(255) NOT NULL,
    syllabus_summary TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_courses_dept ON courses(department);

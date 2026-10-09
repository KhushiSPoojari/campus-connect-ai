import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { closeDatabase } from '@/lib/db/database';
import {
  registerStudent,
  provisionAdmin,
  createSession,
} from '@/lib/auth/auth-service';
import { SESSION_COOKIE_NAME } from '@/lib/auth/server-auth';
import { GET as getStatsRoute } from '@/app/api/admin/stats/route';
import {
  GET as getStudentsRoute,
  POST as postStudentRoute,
  DELETE as deleteStudentRoute,
} from '@/app/api/admin/students/route';
import {
  GET as getClassroomsRoute,
  POST as postClassroomRoute,
  PUT as putClassroomRoute,
  DELETE as deleteClassroomRoute,
} from '@/app/api/admin/classrooms/route';
import {
  GET as getFacultyRoute,
  POST as postFacultyRoute,
  PUT as putFacultyRoute,
  DELETE as deleteFacultyRoute,
} from '@/app/api/admin/faculty/route';
import {
  GET as getCoursesRoute,
  POST as postCourseRoute,
  PUT as putCourseRoute,
  DELETE as deleteCourseRoute,
} from '@/app/api/admin/courses/route';
import {
  POST as postTimetableRoute,
  DELETE as deleteTimetableRoute,
} from '@/app/api/admin/timetable/route';

describe('Admin Dashboard, Management APIs & Role Authorization', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.DATABASE_PATH = ':memory:';
    process.env.AUTH_SECRET = 'vitest-test-secret-32-characters-long!';
    closeDatabase();
  });

  afterEach(() => {
    closeDatabase();
    process.env = { ...originalEnv };
  });

  function createAdminSessionCookie(): string {
    const admin = provisionAdmin({
      email: 'dash.admin@campus.edu',
      name: 'Dashboard Admin',
      password: 'AdminPassword123!',
      department: 'Administration',
    });
    const session = createSession(admin.id);
    return `${SESSION_COOKIE_NAME}=${session.sessionToken}`;
  }

  function createStudentSessionCookie(): string {
    const student = registerStudent({
      name: 'Dash Student',
      email: 'dash.student@campus.edu',
      password: 'StudentPassword123!',
      confirmPassword: 'StudentPassword123!',
      department: 'CSE',
      studentId: '2026CS999',
    });
    const session = createSession(student.id);
    return `${SESSION_COOKIE_NAME}=${session.sessionToken}`;
  }

  // ================= 1. Overview & Statistics =================
  describe('GET /api/admin/stats', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'x-test-unauthenticated': 'true' },
      });
      const res = await getStatsRoute(req);
      expect(res.status).toBe(401);
    });

    it('rejects student requests with 403 Forbidden', async () => {
      const cookie = createStudentSessionCookie();
      const req = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { cookie },
      });
      const res = await getStatsRoute(req);
      expect(res.status).toBe(403);
    });

    it('returns campus stats when called by an administrator', async () => {
      const cookie = createAdminSessionCookie();
      const req = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { cookie },
      });
      const res = await getStatsRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.stats).toHaveProperty('totalStudents');
      expect(json.stats).toHaveProperty('totalFaculty');
      expect(json.stats).toHaveProperty('totalClassrooms');
      expect(json.stats).toHaveProperty('totalCourses');
      expect(json.stats).toHaveProperty('totalNotices');
      expect(json.stats).toHaveProperty('totalAdmins');
      expect(json.stats.totalAdmins).toBeGreaterThanOrEqual(1);
    });
  });

  // ================= 2. Student Management =================
  describe('Student Accounts Management (/api/admin/students)', () => {
    it('returns student list for administrator and omits password hashes', async () => {
      const adminCookie = createAdminSessionCookie();
      createStudentSessionCookie();

      const req = new NextRequest('http://localhost:3000/api/admin/students', {
        headers: { cookie: adminCookie },
      });
      const res = await getStudentsRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.students)).toBe(true);
      expect(json.students.length).toBeGreaterThanOrEqual(1);

      // Verify passwords and salts are never leaked
      const first = json.students[0];
      expect(first).not.toHaveProperty('passwordHash');
      expect(first).not.toHaveProperty('password_hash');
      expect(first).not.toHaveProperty('salt');
    });

    it('allows administrator to provision a student account', async () => {
      const adminCookie = createAdminSessionCookie();
      const req = new NextRequest('http://localhost:3000/api/admin/students', {
        method: 'POST',
        headers: { cookie: adminCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Student via Admin',
          email: 'admin.provisioned@campus.edu',
          password: 'Password123!',
          department: 'ECE',
          studentId: '2026EC100',
        }),
      });

      const res = await postStudentRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.student.email).toBe('admin.provisioned@campus.edu');
    });

    it('allows administrator to delete a student account', async () => {
      const adminCookie = createAdminSessionCookie();
      const student = registerStudent({
        name: 'To Delete',
        email: 'todelete@campus.edu',
        password: 'Password123!',
      });

      const req = new NextRequest(`http://localhost:3000/api/admin/students?id=${student.id}`, {
        method: 'DELETE',
        headers: { cookie: adminCookie },
      });

      const res = await deleteStudentRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  // ================= 3. Classroom Management =================
  describe('Classroom Management (/api/admin/classrooms)', () => {
    it('creates, updates, and deletes a classroom record', async () => {
      const adminCookie = createAdminSessionCookie();

      // 0. Fetch Classrooms
      const getReq = new NextRequest('http://localhost:3000/api/admin/classrooms', {
        headers: { cookie: adminCookie },
      });
      const getRes = await getClassroomsRoute(getReq);
      expect(getRes.status).toBe(200);

      // 1. Create Classroom
      const createReq = new NextRequest('http://localhost:3000/api/admin/classrooms', {
        method: 'POST',
        headers: { cookie: adminCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomNumber: 'TEST-LH-99',
          buildingName: 'Innovation Hub',
          floor: 3,
          wing: 'North',
          capacity: 75,
          type: 'Lecture Hall',
          amenities: ['Projector', 'Air Conditioned'],
        }),
      });

      const createRes = await postClassroomRoute(createReq);
      expect(createRes.status).toBe(201);
      const created = await createRes.json();
      expect(created.classroom.roomNumber).toBe('TEST-LH-99');
      const roomId = created.classroom.id;

      // 2. Update Classroom
      const updateReq = new NextRequest('http://localhost:3000/api/admin/classrooms', {
        method: 'PUT',
        headers: { cookie: adminCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: roomId,
          roomNumber: 'TEST-LH-99-UPDATED',
          buildingName: 'Innovation Hub',
          floor: 3,
          capacity: 100,
          type: 'Auditorium',
        }),
      });

      const updateRes = await putClassroomRoute(updateReq);
      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json();
      expect(updated.classroom.roomNumber).toBe('TEST-LH-99-UPDATED');
      expect(updated.classroom.capacity).toBe(100);

      // 3. Delete Classroom
      const deleteReq = new NextRequest(`http://localhost:3000/api/admin/classrooms?id=${roomId}`, {
        method: 'DELETE',
        headers: { cookie: adminCookie },
      });

      const deleteRes = await deleteClassroomRoute(deleteReq);
      expect(deleteRes.status).toBe(200);
      const deleted = await deleteRes.json();
      expect(deleted.success).toBe(true);
    });
  });

  // ================= 4. Faculty Management =================
  describe('Faculty Management (/api/admin/faculty)', () => {
    it('creates, updates, and deletes a faculty member', async () => {
      const adminCookie = createAdminSessionCookie();

      // 0. Fetch Faculty
      const getReq = new NextRequest('http://localhost:3000/api/admin/faculty', {
        headers: { cookie: adminCookie },
      });
      const getRes = await getFacultyRoute(getReq);
      expect(getRes.status).toBe(200);

      // 1. Create Faculty
      const createReq = new NextRequest('http://localhost:3000/api/admin/faculty', {
        method: 'POST',
        headers: { cookie: adminCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Prof. Test User',
          title: 'Associate Professor',
          department: 'Data Science',
          email: 'test.prof@campus.edu',
          phone: '+1 (555) 999-0000',
          subjects: ['DS101', 'ML201'],
        }),
      });

      const createRes = await postFacultyRoute(createReq);
      expect(createRes.status).toBe(201);
      const created = await createRes.json();
      expect(created.faculty.name).toBe('Prof. Test User');
      const facId = created.faculty.id;

      // 2. Update Faculty
      const updateReq = new NextRequest('http://localhost:3000/api/admin/faculty', {
        method: 'PUT',
        headers: { cookie: adminCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: facId,
          name: 'Prof. Test User PhD',
          department: 'Artificial Intelligence',
          email: 'test.prof@campus.edu',
        }),
      });

      const updateRes = await putFacultyRoute(updateReq);
      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json();
      expect(updated.faculty.name).toBe('Prof. Test User PhD');

      // 3. Delete Faculty
      const deleteReq = new NextRequest(`http://localhost:3000/api/admin/faculty?id=${facId}`, {
        method: 'DELETE',
        headers: { cookie: adminCookie },
      });

      const deleteRes = await deleteFacultyRoute(deleteReq);
      expect(deleteRes.status).toBe(200);
      const deleted = await deleteRes.json();
      expect(deleted.success).toBe(true);
    });
  });

  // ================= 5. Course Management =================
  describe('Course Management (/api/admin/courses)', () => {
    it('creates, updates, and deletes an academic course', async () => {
      const adminCookie = createAdminSessionCookie();

      // 0. Fetch Courses
      const getReq = new NextRequest('http://localhost:3000/api/admin/courses', {
        headers: { cookie: adminCookie },
      });
      const getRes = await getCoursesRoute(getReq);
      expect(getRes.status).toBe(200);

      // 1. Create Course
      const createReq = new NextRequest('http://localhost:3000/api/admin/courses', {
        method: 'POST',
        headers: { cookie: adminCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'TEST999',
          name: 'Advanced Quantum Computing',
          department: 'Computer Science',
          semester: 7,
          credits: 4,
          lectureRoom: 'LH-101',
        }),
      });

      const createRes = await postCourseRoute(createReq);
      expect(createRes.status).toBe(201);
      const created = await createRes.json();
      expect(created.course.code).toBe('TEST999');

      // 2. Update Course
      const updateReq = new NextRequest('http://localhost:3000/api/admin/courses', {
        method: 'PUT',
        headers: { cookie: adminCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'TEST999',
          name: 'Quantum Computing & Algorithms',
          department: 'Computer Science & Physics',
        }),
      });

      const updateRes = await putCourseRoute(updateReq);
      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json();
      expect(updated.course.name).toBe('Quantum Computing & Algorithms');

      // 3. Delete Course
      const deleteReq = new NextRequest('http://localhost:3000/api/admin/courses?code=TEST999', {
        method: 'DELETE',
        headers: { cookie: adminCookie },
      });

      const deleteRes = await deleteCourseRoute(deleteReq);
      expect(deleteRes.status).toBe(200);
      const deleted = await deleteRes.json();
      expect(deleted.success).toBe(true);
    });
  });

  // ================= 6. Timetable Management =================
  describe('Timetable Management (/api/admin/timetable)', () => {
    it('adds and removes a timetable slot for a classroom', async () => {
      const adminCookie = createAdminSessionCookie();

      // Create a test classroom first
      const createReq = new NextRequest('http://localhost:3000/api/admin/classrooms', {
        method: 'POST',
        headers: { cookie: adminCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomNumber: 'TIME-LH-01',
          buildingName: 'Science Center',
          capacity: 50,
        }),
      });
      const createRes = await postClassroomRoute(createReq);
      const createdRoom = (await createRes.json()).classroom;

      // 1. Add Timetable Slot
      const addSlotReq = new NextRequest('http://localhost:3000/api/admin/timetable', {
        method: 'POST',
        headers: { cookie: adminCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: createdRoom.id,
          day: 'Wednesday',
          slot: {
            startTime: '10:00',
            endTime: '11:30',
            subjectCode: 'CS500',
            subjectName: 'Computer Vision',
            facultyName: 'Dr. Visual',
            batch: 'CSE-V',
          },
        }),
      });

      const addSlotRes = await postTimetableRoute(addSlotReq);
      expect(addSlotRes.status).toBe(200);
      const addedData = await addSlotRes.json();
      expect(addedData.classroom.weeklySchedule.Wednesday.length).toBe(1);
      expect(addedData.classroom.weeklySchedule.Wednesday[0].subjectName).toBe('Computer Vision');

      // 2. Delete Timetable Slot
      const deleteSlotReq = new NextRequest('http://localhost:3000/api/admin/timetable', {
        method: 'DELETE',
        headers: { cookie: adminCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: createdRoom.id,
          day: 'Wednesday',
          slotIndex: 0,
        }),
      });

      const deleteSlotRes = await deleteTimetableRoute(deleteSlotReq);
      expect(deleteSlotRes.status).toBe(200);
      const deletedData = await deleteSlotRes.json();
      expect(deletedData.classroom.weeklySchedule.Wednesday.length).toBe(0);
    });
  });
});

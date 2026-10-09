'use client';

import React, { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import {
  FileText,
  Upload,
  Send,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Bot,
  ArrowRight,
  Clock,
  MapPin,
  Trash2,
  AlertTriangle,
  Loader2,
  Users,
  DoorOpen,
  BookOpen,
  Calendar,
  Plus,
  Edit2,
  Search,
  Layers,
  Database,
  GraduationCap,
  X,
  Mail,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SAMPLE_CIRCULARS, type SampleCircular } from '@/data/sample-circulars';
import { useEvents } from '@/lib/events/use-events';
import { useAuth } from '@/lib/context/auth-context';
import { useCampusTime } from '@/lib/context/campus-time-context';
import { getClassroomAvailability } from '@/lib/availability/classroom-availability';
import type { EventCategory, ExtractedCircularData, CampusEvent } from '@/types/event';
import type { Classroom, ClassroomSlot, ClassroomType } from '@/types/classroom';
import type { FacultyMember } from '@/types/faculty';
import type { Course } from '@/types/course';
import type { User as StudentUser } from '@/types/auth';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const CATEGORIES: EventCategory[] = [
  'Academic',
  'Workshop',
  'Cultural',
  'Sports',
  'Placement',
  'Administrative',
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface NoticeFormState {
  eventTitle: string;
  date: string;
  time: string;
  venue: string;
  coordinator: string;
  category: EventCategory;
  summary: string;
  targetAudience: string;
}

const emptyNoticeForm: NoticeFormState = {
  eventTitle: '',
  date: '',
  time: '',
  venue: '',
  coordinator: '',
  category: 'Academic',
  summary: '',
  targetAudience: 'All Campus Students & Faculty',
};

type AdminTab =
  | 'overview'
  | 'students'
  | 'classrooms'
  | 'faculty'
  | 'courses'
  | 'timetable'
  | 'notices';

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

const labelClass =
  'mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400';

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { day, timeStr } = useCampusTime();
  const { events, addEvent, removeEvent } = useEvents();

  // Active view tab
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmButtonText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Global notifications
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');

  // Overview Stats state
  const [stats, setStats] = useState<{
    totalStudents: number;
    totalFaculty: number;
    totalClassrooms: number;
    totalCourses: number;
    totalNotices: number;
    totalAdmins: number;
  } | null>(null);

  // Entities state
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Search and Filter states
  const [studentSearch, setStudentSearch] = useState('');
  const [classroomSearch, setClassroomSearch] = useState('');
  const [facultySearch, setFacultySearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');

  // Timetable section states
  const [selectedTimetableRoom, setSelectedTimetableRoom] = useState<string>('');
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<string>('Monday');

  // Entity Modal Forms state
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    name: '',
    email: '',
    password: '',
    department: 'Computer Science & Engineering',
    studentId: '',
  });

  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [classroomForm, setClassroomForm] = useState<{
    id?: string;
    roomNumber: string;
    buildingName: string;
    floor: number;
    wing: 'North' | 'South' | 'East' | 'West' | 'Central';
    capacity: number;
    type: ClassroomType;
    amenities: string;
  }>({
    roomNumber: '',
    buildingName: 'Turing Engineering Tower',
    floor: 1,
    wing: 'Central',
    capacity: 40,
    type: 'Lecture Hall',
    amenities: 'Smart Projector, Central AC, Audio Mic',
  });

  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyMember | null>(null);
  const [facultyForm, setFacultyForm] = useState<{
    id?: string;
    name: string;
    title: string;
    department: string;
    email: string;
    phone: string;
    building: string;
    floor: string;
    roomNumber: string;
    subjects: string;
    bio: string;
  }>({
    name: '',
    title: 'Assistant Professor',
    department: 'Computer Science & Engineering',
    email: '',
    phone: '+1 (555) 019-2800',
    building: 'Turing Engineering Tower',
    floor: '3rd Floor',
    roomNumber: 'Cabin 301',
    subjects: 'CS301, CS402',
    bio: '',
  });

  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    code: '',
    name: '',
    department: 'Computer Science & Engineering',
    semester: 5,
    credits: 4,
    assignedLecturerName: 'Dr. Sarah Mitchell',
    lectureRoom: 'LH-101',
    scheduleSummary: 'Mon, Wed: 10:00 - 11:30 AM',
    syllabusSummary: 'Core theory and experimental lab sessions.',
  });

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotForm, setSlotForm] = useState<ClassroomSlot>({
    startTime: '09:00',
    endTime: '10:30',
    subjectCode: 'CS301',
    subjectName: 'Artificial Intelligence',
    facultyName: 'Dr. Sarah Mitchell',
    batch: 'CSE-A',
  });

  // Notice Upload & Extraction state (Preserved from Phase 4)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [extractionMode, setExtractionMode] = useState<'gemini' | 'fallback' | null>(null);
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([]);
  const [noticeForm, setNoticeForm] = useState<NoticeFormState>(emptyNoticeForm);
  const [rawDocumentName, setRawDocumentName] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const loadDashboardData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [resStats, resStudents, resClassrooms, resFaculty, resCourses] = await Promise.all([
        fetch('/api/admin/stats').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/admin/students').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/admin/classrooms').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/admin/faculty').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/admin/courses').then((r) => (r.ok ? r.json() : null)),
      ]);

      if (resStats?.success) setStats(resStats.stats);
      if (resStudents?.success) setStudents(resStudents.students);
      if (resClassrooms?.success) {
        setClassrooms(resClassrooms.classrooms);
        if (resClassrooms.classrooms.length > 0) {
          setSelectedTimetableRoom((prev) => prev || resClassrooms.classrooms[0].id);
        }
      }
      if (resFaculty?.success) setFaculty(resFaculty.faculty);
      if (resCourses?.success) setCourses(resCourses.courses);
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Load all data when authenticated as admin
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && user?.role === 'admin') {
      Promise.all([
        fetch('/api/admin/stats').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/admin/students').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/admin/classrooms').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/admin/faculty').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/admin/courses').then((r) => (r.ok ? r.json() : null)),
      ])
        .then(([resStats, resStudents, resClassrooms, resFaculty, resCourses]) => {
          if (!isMounted) return;
          if (resStats?.success) setStats(resStats.stats);
          if (resStudents?.success) setStudents(resStudents.students);
          if (resClassrooms?.success) {
            setClassrooms(resClassrooms.classrooms);
            if (resClassrooms.classrooms.length > 0) {
              setSelectedTimetableRoom((prev) => prev || resClassrooms.classrooms[0].id);
            }
          }
          if (resFaculty?.success) setFaculty(resFaculty.faculty);
          if (resCourses?.success) setCourses(resCourses.courses);
        })
        .catch((err) => {
          console.error('Error fetching admin dashboard data:', err);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user]);

  // Confirmation trigger helper
  function requestConfirmation(
    title: string,
    message: string,
    onConfirm: () => void,
    confirmButtonText = 'Confirm Delete'
  ) {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmButtonText,
    });
  }

  // ================= STUDENT ACTIONS =================

  async function handleCreateStudent(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudentForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusType('error');
        setStatusMessage(data.error || 'Failed to create student account.');
        return;
      }
      setStatusType('success');
      setStatusMessage(`Student ${data.student.name} created successfully.`);
      setShowStudentModal(false);
      setNewStudentForm({
        name: '',
        email: '',
        password: '',
        department: 'Computer Science & Engineering',
        studentId: '',
      });
      loadDashboardData();
    } catch {
      setStatusType('error');
      setStatusMessage('Network error occurred while creating student account.');
    }
  }

  function confirmDeleteStudent(student: StudentUser) {
    requestConfirmation(
      'Delete Student Account',
      `Are you sure you want to permanently delete the account for "${student.name}" (${student.email})? This action cannot be undone.`,
      async () => {
        try {
          const res = await fetch(`/api/admin/students?id=${encodeURIComponent(student.id)}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setStatusType('error');
            setStatusMessage(data.error || 'Failed to delete student.');
            return;
          }
          setStatusType('success');
          setStatusMessage(`Student account "${student.name}" removed successfully.`);
          loadDashboardData();
        } catch {
          setStatusType('error');
          setStatusMessage('Network error occurred while deleting student.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    );
  }

  // ================= CLASSROOM ACTIONS =================

  function openAddClassroom() {
    setEditingClassroom(null);
    setClassroomForm({
      roomNumber: '',
      buildingName: 'Turing Engineering Tower',
      floor: 1,
      wing: 'Central',
      capacity: 40,
      type: 'Lecture Hall',
      amenities: 'Smart Projector, Central AC, Audio Mic',
    });
    setShowClassroomModal(true);
  }

  function openEditClassroom(room: Classroom) {
    setEditingClassroom(room);
    setClassroomForm({
      id: room.id,
      roomNumber: room.roomNumber,
      buildingName: room.buildingName,
      floor: room.floor,
      wing: room.wing,
      capacity: room.capacity,
      type: room.type,
      amenities: room.amenities.join(', '),
    });
    setShowClassroomModal(true);
  }

  async function handleSaveClassroom(e: FormEvent) {
    e.preventDefault();
    try {
      const amenitiesArr = classroomForm.amenities
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        id: editingClassroom ? editingClassroom.id : `room-${Date.now()}`,
        roomNumber: classroomForm.roomNumber,
        buildingId: classroomForm.buildingName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        buildingName: classroomForm.buildingName,
        floor: classroomForm.floor,
        wing: classroomForm.wing,
        capacity: classroomForm.capacity,
        type: classroomForm.type,
        amenities: amenitiesArr,
        weeklySchedule: editingClassroom ? editingClassroom.weeklySchedule : {},
      };

      const res = await fetch('/api/admin/classrooms', {
        method: editingClassroom ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusType('error');
        setStatusMessage(data.error || 'Failed to save classroom.');
        return;
      }
      setStatusType('success');
      setStatusMessage(`Classroom ${payload.roomNumber} saved successfully.`);
      setShowClassroomModal(false);
      loadDashboardData();
    } catch {
      setStatusType('error');
      setStatusMessage('Network error occurred while saving classroom.');
    }
  }

  function confirmDeleteClassroom(room: Classroom) {
    requestConfirmation(
      'Delete Classroom',
      `Are you sure you want to permanently delete classroom "${room.roomNumber}" in ${room.buildingName}? All associated timetables will be removed.`,
      async () => {
        try {
          const res = await fetch(`/api/admin/classrooms?id=${encodeURIComponent(room.id)}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setStatusType('error');
            setStatusMessage(data.error || 'Failed to delete classroom.');
            return;
          }
          setStatusType('success');
          setStatusMessage(`Classroom "${room.roomNumber}" removed successfully.`);
          loadDashboardData();
        } catch {
          setStatusType('error');
          setStatusMessage('Network error occurred while deleting classroom.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    );
  }

  // ================= FACULTY ACTIONS =================

  function openAddFaculty() {
    setEditingFaculty(null);
    setFacultyForm({
      name: '',
      title: 'Assistant Professor',
      department: 'Computer Science & Engineering',
      email: '',
      phone: '+1 (555) 019-2800',
      building: 'Turing Engineering Tower',
      floor: '3rd Floor',
      roomNumber: 'Cabin 301',
      subjects: 'CS301, CS402',
      bio: '',
    });
    setShowFacultyModal(true);
  }

  function openEditFaculty(fac: FacultyMember) {
    setEditingFaculty(fac);
    setFacultyForm({
      id: fac.id,
      name: fac.name,
      title: fac.title,
      department: fac.department,
      email: fac.email,
      phone: fac.phone,
      building: fac.office.building,
      floor: fac.office.floor,
      roomNumber: fac.office.roomNumber,
      subjects: fac.subjects.join(', '),
      bio: fac.bio || '',
    });
    setShowFacultyModal(true);
  }

  async function handleSaveFaculty(e: FormEvent) {
    e.preventDefault();
    try {
      const subjectsArr = facultyForm.subjects
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        id: editingFaculty ? editingFaculty.id : `fac-${Date.now()}`,
        name: facultyForm.name,
        title: facultyForm.title,
        department: facultyForm.department,
        email: facultyForm.email,
        phone: facultyForm.phone,
        office: {
          building: facultyForm.building,
          floor: facultyForm.floor,
          roomNumber: facultyForm.roomNumber,
        },
        subjects: subjectsArr,
        bio: facultyForm.bio,
        weeklySchedule: editingFaculty ? editingFaculty.weeklySchedule : {},
      };

      const res = await fetch('/api/admin/faculty', {
        method: editingFaculty ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusType('error');
        setStatusMessage(data.error || 'Failed to save faculty member.');
        return;
      }
      setStatusType('success');
      setStatusMessage(`Faculty member "${payload.name}" saved successfully.`);
      setShowFacultyModal(false);
      loadDashboardData();
    } catch {
      setStatusType('error');
      setStatusMessage('Network error occurred while saving faculty member.');
    }
  }

  function confirmDeleteFaculty(fac: FacultyMember) {
    requestConfirmation(
      'Delete Faculty Record',
      `Are you sure you want to permanently delete profile for "${fac.name}" (${fac.title})?`,
      async () => {
        try {
          const res = await fetch(`/api/admin/faculty?id=${encodeURIComponent(fac.id)}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setStatusType('error');
            setStatusMessage(data.error || 'Failed to delete faculty member.');
            return;
          }
          setStatusType('success');
          setStatusMessage(`Faculty member "${fac.name}" removed successfully.`);
          loadDashboardData();
        } catch {
          setStatusType('error');
          setStatusMessage('Network error occurred while deleting faculty.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    );
  }

  // ================= COURSE ACTIONS =================

  function openAddCourse() {
    setEditingCourse(null);
    setCourseForm({
      code: '',
      name: '',
      department: 'Computer Science & Engineering',
      semester: 5,
      credits: 4,
      assignedLecturerName: 'Dr. Sarah Mitchell',
      lectureRoom: 'LH-101',
      scheduleSummary: 'Mon, Wed: 10:00 - 11:30 AM',
      syllabusSummary: 'Comprehensive curriculum and core modules.',
    });
    setShowCourseModal(true);
  }

  function openEditCourse(c: Course) {
    setEditingCourse(c);
    setCourseForm({
      code: c.code,
      name: c.name,
      department: c.department,
      semester: c.semester,
      credits: c.credits,
      assignedLecturerName: c.assignedLecturerName,
      lectureRoom: c.lectureRoom,
      scheduleSummary: c.scheduleSummary,
      syllabusSummary: c.syllabusSummary,
    });
    setShowCourseModal(true);
  }

  async function handleSaveCourse(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/courses', {
        method: editingCourse ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusType('error');
        setStatusMessage(data.error || 'Failed to save course.');
        return;
      }
      setStatusType('success');
      setStatusMessage(`Course "${courseForm.code} - ${courseForm.name}" saved successfully.`);
      setShowCourseModal(false);
      loadDashboardData();
    } catch {
      setStatusType('error');
      setStatusMessage('Network error occurred while saving course.');
    }
  }

  function confirmDeleteCourse(c: Course) {
    requestConfirmation(
      'Delete Course',
      `Are you sure you want to permanently delete course "${c.code}: ${c.name}"?`,
      async () => {
        try {
          const res = await fetch(`/api/admin/courses?code=${encodeURIComponent(c.code)}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setStatusType('error');
            setStatusMessage(data.error || 'Failed to delete course.');
            return;
          }
          setStatusType('success');
          setStatusMessage(`Course "${c.code}" removed successfully.`);
          loadDashboardData();
        } catch {
          setStatusType('error');
          setStatusMessage('Network error occurred while deleting course.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    );
  }

  // ================= TIMETABLE ACTIONS =================

  async function handleAddSlot(e: FormEvent) {
    e.preventDefault();
    if (!selectedTimetableRoom) return;

    try {
      const res = await fetch('/api/admin/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: selectedTimetableRoom,
          day: selectedTimetableDay,
          slot: slotForm,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusType('error');
        setStatusMessage(data.error || 'Failed to add timetable slot.');
        return;
      }
      setStatusType('success');
      setStatusMessage(`Schedule slot added for ${selectedTimetableDay}.`);
      setShowSlotModal(false);
      loadDashboardData();
    } catch {
      setStatusType('error');
      setStatusMessage('Network error occurred while adding timetable slot.');
    }
  }

  function confirmDeleteSlot(room: Classroom, dayName: string, index: number, slot: ClassroomSlot) {
    requestConfirmation(
      'Delete Timetable Slot',
      `Remove "${slot.subjectName}" (${slot.startTime} - ${slot.endTime}) from ${room.roomNumber} on ${dayName}?`,
      async () => {
        try {
          const res = await fetch('/api/admin/timetable', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              classroomId: room.id,
              day: dayName,
              slotIndex: index,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setStatusType('error');
            setStatusMessage(data.error || 'Failed to delete timetable slot.');
            return;
          }
          setStatusType('success');
          setStatusMessage('Timetable slot removed successfully.');
          loadDashboardData();
        } catch {
          setStatusType('error');
          setStatusMessage('Network error occurred while removing timetable slot.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    );
  }

  // ================= CIRCULAR / NOTICES ACTIONS =================

  function validateAndSetFile(file: File) {
    setStatusMessage('');
    setExtractionMode(null);
    setExtractionWarnings([]);

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setStatusType('error');
      setStatusMessage('Invalid file type: Please upload a PDF document (.pdf).');
      setSelectedFile(null);
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setStatusType('error');
      setStatusMessage(
        `File size limit exceeded: Selected PDF is ${(file.size / (1024 * 1024)).toFixed(2)} MB (maximum allowed is 5 MB).`
      );
      setSelectedFile(null);
      return false;
    }

    setSelectedFile(file);
    setRawDocumentName(file.name);
    setStatusType('info');
    setStatusMessage(`PDF Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB). Ready for extraction.`);
    return true;
  }

  async function runExtraction(params: { file?: File; sample?: SampleCircular }) {
    setIsProcessing(true);
    setStatusMessage('');
    setExtractionWarnings([]);

    try {
      setProcessingStep('Preparing document for parsing engine...');
      const formData = new FormData();

      if (params.file) {
        formData.append('file', params.file);
      } else if (params.sample) {
        formData.append('rawText', params.sample.rawText);
        formData.append('sampleId', params.sample.id);
        formData.append('filename', params.sample.filename);
        setRawDocumentName(params.sample.filename);
      }

      setProcessingStep('Analyzing circular with Gemini Multimodal AI...');
      const response = await fetch('/api/admin/parse-circular', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process document with AI model.');
      }

      const extracted: ExtractedCircularData = data.data;
      setExtractionMode(data.mode);

      if (data.mode === 'fallback') {
        setExtractionWarnings([
          'Gemini API offline or quota exceeded. Used intelligent server heuristic fallback parser.',
        ]);
      }

      setNoticeForm({
        eventTitle: extracted.eventTitle || '',
        date: extracted.date || '',
        time: extracted.time || '',
        venue: extracted.venue || '',
        coordinator: extracted.coordinator || '',
        category: (extracted.category as EventCategory) || 'Academic',
        summary: extracted.summary || '',
        targetAudience: extracted.targetAudience || 'All Campus Students & Faculty',
      });

      setStatusType('success');
      setStatusMessage(
        `Document processed successfully via ${data.mode === 'gemini' ? 'Gemini 2.5 Flash AI' : 'Deterministic Server Parser'}. Review details below.`
      );
    } catch (err) {
      setStatusType('error');
      setStatusMessage(err instanceof Error ? err.message : 'Error extracting circular details.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  }

  async function handlePublishNotice(e: FormEvent) {
    e.preventDefault();
    if (!noticeForm.eventTitle || !noticeForm.date || !noticeForm.venue || !noticeForm.coordinator || !noticeForm.summary) {
      setStatusType('error');
      setStatusMessage('Please complete all mandatory fields (*) before publishing.');
      return;
    }

    if (isPublishing) return;
    setIsPublishing(true);
    setStatusMessage('');

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventTitle: noticeForm.eventTitle.trim(),
          date: noticeForm.date.trim(),
          time: noticeForm.time.trim() || undefined,
          venue: noticeForm.venue.trim(),
          coordinator: noticeForm.coordinator.trim(),
          category: noticeForm.category,
          summary: noticeForm.summary.trim(),
          targetAudience: noticeForm.targetAudience.trim() || undefined,
          source: extractionMode === 'gemini' ? 'Gemini Extracted' : 'Official Circular',
          rawDocumentName: rawDocumentName || 'Admin_Upload.pdf',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setStatusType('error');
        setStatusMessage(data.error || 'Failed to publish notice to the server registry.');
        return;
      }

      addEvent(data.event);
      setStatusType('success');
      setStatusMessage(`Notice "${data.event.title}" published successfully to SQLite!`);
      setNoticeForm(emptyNoticeForm);
      setSelectedFile(null);
      setRawDocumentName('');
      loadDashboardData();
    } catch (err) {
      setStatusType('error');
      setStatusMessage(err instanceof Error ? err.message : 'Network error occurred while publishing notice.');
    } finally {
      setIsPublishing(false);
    }
  }

  function confirmDeleteNotice(item: CampusEvent) {
    requestConfirmation(
      'Delete Notice',
      `Are you sure you want to delete notice "${item.title}"? It will be permanently removed from the central database.`,
      async () => {
        try {
          const res = await fetch(`/api/events?id=${encodeURIComponent(item.id)}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setStatusType('error');
            setStatusMessage(data.error || 'Failed to delete notice.');
            return;
          }
          removeEvent(item.id);
          setStatusType('success');
          setStatusMessage(`Notice "${item.title}" deleted successfully.`);
          loadDashboardData();
        } catch {
          setStatusType('error');
          setStatusMessage('Network error occurred while deleting notice.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    );
  }

  // ================= RENDER GUARDS =================

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Verifying administrator authorization...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-lg">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
              Administrator Access Restricted
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {isAuthenticated && user?.role === 'student' ? (
                <>
                  You are signed in as <span className="font-semibold text-zinc-800 dark:text-zinc-200">{user.name}</span> with the <Badge variant="info">Student</Badge> role. Administrator privileges are required to access campus administration.
                </>
              ) : (
                'You must be signed in with an authorized campus administrator account to access the Admin Dashboard.'
              )}
            </p>
          </div>

            <Link
              href="/admin/login"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
            >
              <span>Sign In as Administrator</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="w-full flex items-center justify-center rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              Return to Student Portal
            </Link>
        </div>
      </div>
    );
  }

  // Live occupancy calculations for stats overview
  const vacantRoomsCount = classrooms.filter((room) => {
    const avail = getClassroomAvailability(room, day, timeStr);
    return !avail.isOccupied;
  }).length;

  const currentTimetableClassroom = classrooms.find((c) => c.id === selectedTimetableRoom);
  const currentDaySlots = currentTimetableClassroom?.weeklySchedule[selectedTimetableDay] || [];

  return (
    <div className="flex-1 space-y-8 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pt-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Campus Admin Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Institutional Management &amp; Space Optimization Platform
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-medium">SQLite WAL Engine: Active</span>
          </div>
          <Button
            variant="outline"
            className="text-xs"
            onClick={loadDashboardData}
            disabled={dataLoading}
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${dataLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          role="alert"
          className={`rounded-xl border p-4 text-sm flex items-start justify-between gap-3 ${
            statusType === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
              : statusType === 'error'
              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'
              : 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {statusType === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            ) : statusType === 'error' ? (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            ) : (
              <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
            )}
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage('')}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dashboard Nav Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 pb-2 scrollbar-none">
        {[
          { id: 'overview', label: 'Overview & Stats', icon: Layers },
          { id: 'students', label: 'Student Accounts', icon: Users, badge: students.length },
          { id: 'classrooms', label: 'Classrooms', icon: DoorOpen, badge: classrooms.length },
          { id: 'faculty', label: 'Faculty Directory', icon: GraduationCap, badge: faculty.length },
          { id: 'courses', label: 'Courses & Subjects', icon: BookOpen, badge: courses.length },
          { id: 'timetable', label: 'Timetables & Schedules', icon: Calendar },
          { id: 'notices', label: 'Notices & Circulars', icon: FileText, badge: events.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ================= SECTION 1: OVERVIEW & STATS ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Registered Students</span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {stats?.totalStudents ?? students.length}
              </div>
              <p className="text-[11px] text-zinc-500">Active student accounts</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Classrooms &amp; Labs</span>
                <DoorOpen className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {classrooms.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {vacantRoomsCount} currently vacant ({day})
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Faculty Members</span>
                <GraduationCap className="w-4 h-4 text-violet-600" />
              </div>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {faculty.length}
              </div>
              <p className="text-[11px] text-zinc-500">Across all engineering depts</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Courses &amp; Notices</span>
                <BookOpen className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {courses.length} <span className="text-base text-zinc-400 font-normal">/ {events.length} notices</span>
              </div>
              <p className="text-[11px] text-zinc-500">Active university curriculum</p>
            </div>
          </div>

          {/* Quick Management Shortcuts */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900/10 via-zinc-50 to-zinc-100 dark:from-indigo-950/20 dark:via-zinc-900 dark:to-zinc-900 border border-indigo-200/60 dark:border-indigo-900/40 space-y-4">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Quick Administrative Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('notices');
                }}
                className="p-4 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 text-left transition space-y-1 shadow-sm"
              >
                <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs">
                  <Upload className="w-4 h-4" />
                  <span>Parse PDF Circular</span>
                </div>
                <p className="text-xs text-zinc-500">Extract notices using Gemini AI</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowStudentModal(true);
                }}
                className="p-4 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 text-left transition space-y-1 shadow-sm"
              >
                <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs">
                  <Plus className="w-4 h-4" />
                  <span>Add Student</span>
                </div>
                <p className="text-xs text-zinc-500">Provision student record</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  openAddClassroom();
                }}
                className="p-4 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 text-left transition space-y-1 shadow-sm"
              >
                <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs">
                  <Plus className="w-4 h-4" />
                  <span>Add Classroom</span>
                </div>
                <p className="text-xs text-zinc-500">Add lecture hall or lab</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  openAddFaculty();
                }}
                className="p-4 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 text-left transition space-y-1 shadow-sm"
              >
                <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs">
                  <Plus className="w-4 h-4" />
                  <span>Add Faculty Member</span>
                </div>
                <p className="text-xs text-zinc-500">Add professor or lecturer</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION 2: STUDENT MANAGEMENT ================= */}
      {activeTab === 'students' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Student Account Registry
              </h2>
              <p className="text-xs text-zinc-500">
                View, register, and manage campus student credentials and institutional details.
              </p>
            </div>
            <Button
              variant="primary"
              className="text-xs"
              onClick={() => setShowStudentModal(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add Student Account</span>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students by name, email, or student ID..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase text-[11px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {students
                    .filter(
                      (s) =>
                        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        (s.studentId && s.studentId.toLowerCase().includes(studentSearch.toLowerCase()))
                    )
                    .map((student) => (
                      <tr key={student.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                        <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                          {student.name}
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                          {student.email}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {student.studentId || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                          {student.department || 'General'}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 text-xs">
                          {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => confirmDeleteStudent(student)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                            title="Delete student account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {students.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-500">
                No student accounts found. Click &quot;Add Student Account&quot; to provision a student.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= SECTION 3: CLASSROOM MANAGEMENT ================= */}
      {activeTab === 'classrooms' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Classrooms &amp; Laboratories
              </h2>
              <p className="text-xs text-zinc-500">
                Manage room capacities, amenities, facilities, and physical wing locations.
              </p>
            </div>
            <Button
              variant="primary"
              className="text-xs"
              onClick={openAddClassroom}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add Classroom</span>
            </Button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={classroomSearch}
              onChange={(e) => setClassroomSearch(e.target.value)}
              placeholder="Search classrooms by room number or building..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms
              .filter(
                (r) =>
                  r.roomNumber.toLowerCase().includes(classroomSearch.toLowerCase()) ||
                  r.buildingName.toLowerCase().includes(classroomSearch.toLowerCase())
              )
              .map((room) => {
                const avail = getClassroomAvailability(room, day, timeStr);
                return (
                  <div
                    key={room.id}
                    className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                            {room.roomNumber}
                          </span>
                          <Badge variant={avail.isOccupied ? 'danger' : 'success'}>
                            {avail.statusLabel}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500">{room.buildingName} · Floor {room.floor} ({room.wing} Wing)</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditClassroom(room)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition"
                          title="Edit classroom"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDeleteClassroom(room)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                          title="Delete classroom"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                        <span>Type:</span>
                        <span className="font-semibold">{room.type}</span>
                      </div>
                      <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                        <span>Capacity:</span>
                        <span className="font-semibold">{room.capacity} seats</span>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {room.amenities.map((am) => (
                          <span
                            key={am}
                            className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          >
                            {am}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ================= SECTION 4: FACULTY MANAGEMENT ================= */}
      {activeTab === 'faculty' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Faculty Member Directory
              </h2>
              <p className="text-xs text-zinc-500">
                Manage faculty appointments, department assignments, office locations, and contact info.
              </p>
            </div>
            <Button
              variant="primary"
              className="text-xs"
              onClick={openAddFaculty}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add Faculty Member</span>
            </Button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={facultySearch}
              onChange={(e) => setFacultySearch(e.target.value)}
              placeholder="Search faculty by name or department..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {faculty
              .filter(
                (f) =>
                  f.name.toLowerCase().includes(facultySearch.toLowerCase()) ||
                  f.department.toLowerCase().includes(facultySearch.toLowerCase())
              )
              .map((fac) => (
                <div
                  key={fac.id}
                  className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {fac.name}
                      </h3>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                        {fac.title}
                      </p>
                      <p className="text-[11px] text-zinc-500">{fac.department}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditFaculty(fac)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition"
                        title="Edit faculty"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDeleteFaculty(fac)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                        title="Delete faculty"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{fac.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{fac.office.roomNumber}, {fac.office.building}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {fac.subjects.map((sub) => (
                        <span
                          key={sub}
                          className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ================= SECTION 5: COURSES MANAGEMENT ================= */}
      {activeTab === 'courses' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Courses &amp; Subjects Curriculum
              </h2>
              <p className="text-xs text-zinc-500">
                Configure academic subjects, assigned lecturers, credits, and primary lecture rooms.
              </p>
            </div>
            <Button
              variant="primary"
              className="text-xs"
              onClick={openAddCourse}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add Course</span>
            </Button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
              placeholder="Search courses by code, title, or department..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase text-[11px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Course Title</th>
                    <th className="py-3 px-4">Credits</th>
                    <th className="py-3 px-4">Lecturer</th>
                    <th className="py-3 px-4">Lecture Room</th>
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {courses
                    .filter(
                      (c) =>
                        c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
                        c.name.toLowerCase().includes(courseSearch.toLowerCase())
                    )
                    .map((course) => (
                      <tr key={course.code} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {course.code}
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                          {course.name}
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                          {course.credits} Credits (Sem {course.semester})
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                          {course.assignedLecturerName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {course.lectureRoom}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-zinc-500">
                          {course.scheduleSummary}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditCourse(course)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition"
                              title="Edit course"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmDeleteCourse(course)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                              title="Delete course"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION 6: TIMETABLE & SCHEDULES ================= */}
      {activeTab === 'timetable' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Classroom Timetable &amp; Schedule Editor
              </h2>
              <p className="text-xs text-zinc-500">
                Configure day-by-day batch occupancy slots and lecture schedules.
              </p>
            </div>
            <Button
              variant="primary"
              className="text-xs"
              onClick={() => setShowSlotModal(true)}
              disabled={!selectedTimetableRoom}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add Schedule Slot</span>
            </Button>
          </div>

          {/* Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
            <div>
              <label className={labelClass}>Select Classroom</label>
              <select
                value={selectedTimetableRoom}
                onChange={(e) => setSelectedTimetableRoom(e.target.value)}
                className={inputClass}
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.roomNumber} — {c.buildingName} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Select Day of Week</label>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {DAYS_OF_WEEK.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedTimetableDay(d)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      selectedTimetableDay === d
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Slot Grid for selected Classroom & Day */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
              <span>
                Schedule for {currentTimetableClassroom?.roomNumber} on {selectedTimetableDay}
              </span>
              <span className="text-xs text-zinc-500 font-normal">
                {currentDaySlots.length} scheduled sessions
              </span>
            </h3>

            {currentDaySlots.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentDaySlots.map((slot, index) => (
                  <div
                    key={`${slot.startTime}-${index}`}
                    className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3" />
                        <span>{slot.startTime} - {slot.endTime}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          currentTimetableClassroom &&
                          confirmDeleteSlot(currentTimetableClassroom, selectedTimetableDay, index, slot)
                        }
                        className="p-1 rounded text-zinc-400 hover:text-red-600 transition"
                        title="Delete slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {slot.subjectName}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {slot.subjectCode} · {slot.facultyName}
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800">
                      <span>Batch: <strong className="text-zinc-700 dark:text-zinc-300">{slot.batch}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                No slots scheduled for {selectedTimetableDay}. Room is fully vacant on this day.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= SECTION 7: NOTICES & CIRCULARS ================= */}
      {activeTab === 'notices' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Sub-layout: Upload Circular & Gemini Parser */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 space-y-6">
              <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <Bot className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      Upload Circular PDF for Gemini Extraction
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Extract dates, venue, coordinator, and details automatically.
                    </p>
                  </div>
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.[0]) validateAndSetFile(e.dataTransfer.files[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                      : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-400'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) validateAndSetFile(e.target.files[0]);
                    }}
                    accept=".pdf,application/pdf"
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 mx-auto text-indigo-500 mb-2" />
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {selectedFile ? selectedFile.name : 'Click or drag PDF here to upload'}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">Maximum size: 5 MB</p>
                </div>

                {selectedFile && (
                  <Button
                    variant="primary"
                    disabled={isProcessing}
                    onClick={() => runExtraction({ file: selectedFile })}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{processingStep || 'Processing document...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Run Gemini AI Extraction</span>
                      </>
                    )}
                  </Button>
                )}

                {extractionWarnings.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    {extractionWarnings.map((w, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sample Circulars Shortcut */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  <span className="text-[11px] font-semibold text-zinc-500">
                    Or select a pre-loaded sample circular:
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {SAMPLE_CIRCULARS.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => runExtraction({ sample })}
                        className="text-left p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition text-xs flex items-center justify-between"
                      >
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{sample.name}</span>
                        <Badge variant="info">{sample.category}</Badge>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Notice Form & Publish */}
            <div className="lg:col-span-6 space-y-6">
              <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Review &amp; Publish Official Notice
                </h2>

                <form onSubmit={handlePublishNotice} className="space-y-3">
                  <div>
                    <label className={labelClass}>Event Title *</label>
                    <input
                      type="text"
                      required
                      value={noticeForm.eventTitle}
                      onChange={(e) => setNoticeForm({ ...noticeForm, eventTitle: e.target.value })}
                      placeholder="e.g. AI & Robotics Hackathon 2026"
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Date *</label>
                      <input
                        type="text"
                        required
                        value={noticeForm.date}
                        onChange={(e) => setNoticeForm({ ...noticeForm, date: e.target.value })}
                        placeholder="e.g. October 24, 2026"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Time</label>
                      <input
                        type="text"
                        value={noticeForm.time}
                        onChange={(e) => setNoticeForm({ ...noticeForm, time: e.target.value })}
                        placeholder="e.g. 09:00 AM - 05:00 PM"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Venue *</label>
                      <input
                        type="text"
                        required
                        value={noticeForm.venue}
                        onChange={(e) => setNoticeForm({ ...noticeForm, venue: e.target.value })}
                        placeholder="e.g. Turing Engineering Wing, Lab 301"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Category</label>
                      <select
                        value={noticeForm.category}
                        onChange={(e) =>
                          setNoticeForm({ ...noticeForm, category: e.target.value as EventCategory })
                        }
                        className={inputClass}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Coordinator *</label>
                    <input
                      type="text"
                      required
                      value={noticeForm.coordinator}
                      onChange={(e) => setNoticeForm({ ...noticeForm, coordinator: e.target.value })}
                      placeholder="e.g. Dr. Sarah Mitchell"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Summary / Description *</label>
                    <textarea
                      required
                      rows={3}
                      value={noticeForm.summary}
                      onChange={(e) => setNoticeForm({ ...noticeForm, summary: e.target.value })}
                      placeholder="Concise summary of event..."
                      className={inputClass}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isPublishing}
                    className="w-full flex items-center justify-center gap-2 mt-4"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Publishing to Central Database...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Publish Notice to Portal</span>
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>

          {/* Manage Published Notices Table */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Published Notices Registry ({events.length})
            </h3>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase text-[11px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Date &amp; Time</th>
                      <th className="py-3 px-4">Venue</th>
                      <th className="py-3 px-4">Coordinator</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {events.map((evt) => (
                      <tr key={evt.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                        <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                          {evt.title}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="info">{evt.category}</Badge>
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                          {evt.date} {evt.time ? `· ${evt.time}` : ''}
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                          {evt.venue}
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                          {evt.coordinator}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => confirmDeleteNotice(evt)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                            title="Delete notice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD STUDENT ================= */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Provision New Student Account
              </h3>
              <button
                type="button"
                onClick={() => setShowStudentModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={newStudentForm.name}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                  placeholder="e.g. Priya Sharma"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Institutional Email *</label>
                <input
                  type="email"
                  required
                  value={newStudentForm.email}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                  placeholder="e.g. priya.sharma@campus.edu"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Initial Password (Min 8 Chars) *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newStudentForm.password}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, password: e.target.value })}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Student ID</label>
                  <input
                    type="text"
                    value={newStudentForm.studentId}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, studentId: e.target.value })}
                    placeholder="2026CS202"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Department</label>
                  <input
                    type="text"
                    value={newStudentForm.department}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, department: e.target.value })}
                    placeholder="CSE"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowStudentModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Create Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT CLASSROOM ================= */}
      {showClassroomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {editingClassroom ? 'Edit Classroom' : 'Add New Classroom'}
              </h3>
              <button
                type="button"
                onClick={() => setShowClassroomModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClassroom} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Room Number *</label>
                  <input
                    type="text"
                    required
                    value={classroomForm.roomNumber}
                    onChange={(e) => setClassroomForm({ ...classroomForm, roomNumber: e.target.value })}
                    placeholder="e.g. LH-205"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Capacity *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={classroomForm.capacity}
                    onChange={(e) => setClassroomForm({ ...classroomForm, capacity: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Building Name *</label>
                <input
                  type="text"
                  required
                  value={classroomForm.buildingName}
                  onChange={(e) => setClassroomForm({ ...classroomForm, buildingName: e.target.value })}
                  placeholder="e.g. Turing Engineering Tower"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Floor</label>
                  <input
                    type="number"
                    value={classroomForm.floor}
                    onChange={(e) => setClassroomForm({ ...classroomForm, floor: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Type</label>
                  <select
                    value={classroomForm.type}
                    onChange={(e) => setClassroomForm({ ...classroomForm, type: e.target.value as ClassroomType })}
                    className={inputClass}
                  >
                    <option value="Lecture Hall">Lecture Hall</option>
                    <option value="Computer Lab">Computer Lab</option>
                    <option value="Seminar Room">Seminar Room</option>
                    <option value="Tutorial Room">Tutorial Room</option>
                    <option value="Auditorium">Auditorium</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Amenities (Comma Separated)</label>
                <input
                  type="text"
                  value={classroomForm.amenities}
                  onChange={(e) => setClassroomForm({ ...classroomForm, amenities: e.target.value })}
                  placeholder="Smart Projector, Central AC, Audio Mic"
                  className={inputClass}
                />
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowClassroomModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {editingClassroom ? 'Save Changes' : 'Create Classroom'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT FACULTY ================= */}
      {showFacultyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {editingFaculty ? 'Edit Faculty Member' : 'Add Faculty Member'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFacultyModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFaculty} className="space-y-3">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={facultyForm.name}
                  onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
                  placeholder="Dr. Samantha Vance"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Title</label>
                  <input
                    type="text"
                    value={facultyForm.title}
                    onChange={(e) => setFacultyForm({ ...facultyForm, title: e.target.value })}
                    placeholder="Associate Professor"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Department</label>
                  <input
                    type="text"
                    value={facultyForm.department}
                    onChange={(e) => setFacultyForm({ ...facultyForm, department: e.target.value })}
                    placeholder="Computer Science"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Email *</label>
                  <input
                    type="email"
                    required
                    value={facultyForm.email}
                    onChange={(e) => setFacultyForm({ ...facultyForm, email: e.target.value })}
                    placeholder="faculty@campus.edu"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="text"
                    value={facultyForm.phone}
                    onChange={(e) => setFacultyForm({ ...facultyForm, phone: e.target.value })}
                    placeholder="+1 (555) 019-2800"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Office Cabin</label>
                <input
                  type="text"
                  value={facultyForm.roomNumber}
                  onChange={(e) => setFacultyForm({ ...facultyForm, roomNumber: e.target.value })}
                  placeholder="Cabin 304, 3rd Floor"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Subjects (Comma Separated)</label>
                <input
                  type="text"
                  value={facultyForm.subjects}
                  onChange={(e) => setFacultyForm({ ...facultyForm, subjects: e.target.value })}
                  placeholder="CS301, CS402"
                  className={inputClass}
                />
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFacultyModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {editingFaculty ? 'Save Changes' : 'Create Profile'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT COURSE ================= */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCourseModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Course Code *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingCourse}
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                    placeholder="e.g. CS405"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={courseForm.credits}
                    onChange={(e) => setCourseForm({ ...courseForm, credits: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Course Name *</label>
                <input
                  type="text"
                  required
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  placeholder="e.g. Distributed Cloud Systems"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Department</label>
                  <input
                    type="text"
                    value={courseForm.department}
                    onChange={(e) => setCourseForm({ ...courseForm, department: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={courseForm.semester}
                    onChange={(e) => setCourseForm({ ...courseForm, semester: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Assigned Lecturer</label>
                  <input
                    type="text"
                    value={courseForm.assignedLecturerName}
                    onChange={(e) => setCourseForm({ ...courseForm, assignedLecturerName: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Lecture Room</label>
                  <input
                    type="text"
                    value={courseForm.lectureRoom}
                    onChange={(e) => setCourseForm({ ...courseForm, lectureRoom: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCourseModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {editingCourse ? 'Save Changes' : 'Create Course'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD TIMETABLE SLOT ================= */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Add Timetable Slot ({selectedTimetableDay})
              </h3>
              <button
                type="button"
                onClick={() => setShowSlotModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Start Time (HH:MM) *</label>
                  <input
                    type="text"
                    required
                    pattern="[0-2][0-9]:[0-5][0-9]"
                    value={slotForm.startTime}
                    onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                    placeholder="09:00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>End Time (HH:MM) *</label>
                  <input
                    type="text"
                    required
                    pattern="[0-2][0-9]:[0-5][0-9]"
                    value={slotForm.endTime}
                    onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                    placeholder="10:30"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Subject Name *</label>
                <input
                  type="text"
                  required
                  value={slotForm.subjectName}
                  onChange={(e) => setSlotForm({ ...slotForm, subjectName: e.target.value })}
                  placeholder="Artificial Intelligence"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Subject Code</label>
                  <input
                    type="text"
                    value={slotForm.subjectCode}
                    onChange={(e) => setSlotForm({ ...slotForm, subjectCode: e.target.value })}
                    placeholder="CS301"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Batch</label>
                  <input
                    type="text"
                    value={slotForm.batch}
                    onChange={(e) => setSlotForm({ ...slotForm, batch: e.target.value })}
                    placeholder="CSE-A"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Faculty In-Charge</label>
                <input
                  type="text"
                  value={slotForm.facultyName}
                  onChange={(e) => setSlotForm({ ...slotForm, facultyName: e.target.value })}
                  placeholder="Dr. Sarah Mitchell"
                  className={inputClass}
                />
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSlotModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Add Slot
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= UNIVERSAL CONFIRMATION MODAL ================= */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl border border-red-200 dark:border-red-900/60 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="pt-3 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                className="text-xs"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                className="text-xs bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmModal.onConfirm}
              >
                {confirmModal.confirmButtonText || 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
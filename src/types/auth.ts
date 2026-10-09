export type UserRole = 'admin' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  studentId?: string;
  createdAt: string;
}

export interface UserRecord extends User {
  passwordHash: string;
  salt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  sessionToken: string;
  expiresAt: string;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  expiresAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterStudentInput {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  department?: string;
  studentId?: string;
}

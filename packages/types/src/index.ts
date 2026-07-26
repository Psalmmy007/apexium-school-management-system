// ============================================================
// Apexium School ERP — Shared Types
// These types are used across apps/web, apps/worker, and packages/db
// ============================================================

// ── Roles ────────────────────────────────────────────────────
export type UserRole = "admin" | "teacher" | "parent" | "student";

export const USER_ROLES: UserRole[] = ["admin", "teacher", "parent", "student"];

// ── Enums ────────────────────────────────────────────────────
export type Gender = "male" | "female" | "other";
export type StudentStatus = "active" | "inactive" | "graduated" | "transferred";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";

// ── School (Tenant) ──────────────────────────────────────────
export interface School {
  id: string;
  name: string;
  slug: string; // URL-safe identifier, e.g. "lincoln-high"
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── User ──────────────────────────────────────────────────────
export interface User {
  id: string;
  schoolId: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Class & Section ───────────────────────────────────────────
export interface Class {
  id: string;
  schoolId: string;
  name: string;
  code: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Section {
  id: string;
  schoolId: string;
  classId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Student ───────────────────────────────────────────────────
export interface Student {
  id: string;
  schoolId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  gender: Gender | null;
  dateOfBirth: Date | null;
  address: string | null;
  photoUrl: string | null;
  classId: string | null;
  sectionId: string | null;
  status: StudentStatus;
  createdAt: Date;
  updatedAt: Date;

  // Joined relations (optional)
  className?: string;
  sectionName?: string;
  guardians?: StudentGuardian[];
}

export interface StudentGuardian {
  id: string;
  schoolId: string;
  studentId: string;
  parentId: string;
  relationship: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Joined parent info
  parentFirstName?: string;
  parentLastName?: string;
  parentEmail?: string;
}

// ── Attendance ────────────────────────────────────────────────
export interface AttendanceRecord {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  sectionId: string | null;
  date: string; // YYYY-MM-DD
  period: string; // "daily", "morning", "period_1"
  status: AttendanceStatus;
  remarks: string | null;
  markedBy: string | null;
  updatedAt: Date;
  createdAt: Date;

  // Joined fields
  studentFirstName?: string;
  studentLastName?: string;
  admissionNumber?: string;
}

// ── Auth session ──────────────────────────────────────────────
export interface SessionUser {
  id: string;
  schoolId: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

// ── API response helpers ───────────────────────────────────────
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Pagination ────────────────────────────────────────────────
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

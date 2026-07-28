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
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

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

// ── Subject & Period ──────────────────────────────────────────
export interface Subject {
  id: string;
  schoolId: string;
  name: string;
  code: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Period {
  id: string;
  schoolId: string;
  name: string;
  startTime: string; // e.g. "08:00"
  endTime: string; // e.g. "08:45"
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── Academic Term ─────────────────────────────────────────────
export interface AcademicTerm {
  id: string;
  schoolId: string;
  name: string; // e.g. "First Term"
  session: string; // e.g. "2025/2026"
  startDate: Date | null;
  endDate: Date | null;
}

// ── License & Licensing (Milestone 8) ──────────────────────────
export type LicenseTier = "starter" | "growth" | "enterprise";
export type LicenseStatus = "active" | "expired" | "suspended";

export interface License {
  id: string;
  schoolId: string;
  key: string;
  tier: LicenseTier;
  enabledModules: string[];
  maxStudents: number;
  status: LicenseStatus;
  issuedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LicenseEvent {
  id: string;
  schoolId: string;
  licenseId: string;
  eventType: "issued" | "renewed" | "upgraded" | "downgraded" | "expired";
  details?: Record<string, any> | null;
  performedBy?: string | null;
  createdAt: Date;
}

// ── Student Score & Academics ─────────────────────────────────
export interface StudentScore {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  subjectId: string;
  termId: string;
  caScore: number; // Max 40
  examScore: number; // Max 60
  totalScore: number; // caScore + examScore (Max 100)
  grade: string | null; // e.g. "A1", "B2", "C4", "F9"
  remarks: string | null;
  enteredBy: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Joined display fields
  studentFirstName?: string;
  studentLastName?: string;
  admissionNumber?: string;
  subjectName?: string;
  className?: string;
  termName?: string;
}

// ── Student Term Report (Behavioral & Remarks) ────────────────
export interface StudentTermReport {
  id: string;
  schoolId: string;
  studentId: string;
  termId: string;
  principalRemarks: string | null;
  teacherRemarks: string | null;
  affectiveTraits: Array<{ trait: string; rating: number }> | null;
  psychomotorTraits: Array<{ trait: string; rating: number }> | null;
  enteredBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Timetable Entry ───────────────────────────────────────────
export interface TimetableEntry {
  id: string;
  schoolId: string;
  classId: string;
  sectionId: string | null;
  subjectId: string;
  teacherId: string;
  periodId: string;
  dayOfWeek: DayOfWeek;
  roomNumber: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Joined display fields
  className?: string;
  subjectName?: string;
  subjectCode?: string | null;
  teacherName?: string;
  periodName?: string;
  periodStartTime?: string;
  periodEndTime?: string;
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

// ── CBT Platform Types (Milestone 9) ──────────────────────────
export * from "./cbt";

// ── Learning Portal (LMS) Types (Milestone 10) ───────────────
export * from "./lms";

// ── Messaging & Teacher Portal Types (Milestone 11) ───────────
export * from "./messaging";




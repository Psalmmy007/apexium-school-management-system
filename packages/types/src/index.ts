// ============================================================
// Apexium School ERP — Shared Types
// These types are used across apps/web, apps/worker, and packages/db
// ============================================================

// ── Roles ────────────────────────────────────────────────────
export type UserRole = "admin" | "teacher" | "parent" | "student";

export const USER_ROLES: UserRole[] = ["admin", "teacher", "parent", "student"];

// ── School (Tenant) ──────────────────────────────────────────
export interface School {
  id: string;
  name: string;
  slug: string; // URL-safe identifier, e.g. "lincoln-high"
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
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

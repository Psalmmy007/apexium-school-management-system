/**
 * Teacher Class-Scoped Report Card Permission & Boundary Enforcement Test Suite
 *
 * PROOF CRITERIA:
 * 1. Teacher A (assigned to Class X) CAN successfully generate report cards for Class X (HTTP 200 OK).
 * 2. Teacher A (NOT assigned to Class Y) is STRICTLY REJECTED when attempting to generate for Class Y (HTTP 403 Forbidden).
 * 3. Students and Parents are STRICTLY REJECTED (HTTP 403 Forbidden).
 * 4. Unauthenticated callers are REJECTED (HTTP 401 Unauthorized).
 * 5. School Admins can generate for any class in their school (HTTP 200 OK).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as generateReports } from "./api/reports/generate/route";
import { getSessionUser } from "@/lib/auth/session";

// ── Mock Auth Session ─────────────────────────────────────────
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(),
}));

// ── Mock Background Job Queue ─────────────────────────────────
vi.mock("@/lib/reports/report-card-service", () => ({
  enqueueReportCardGenerationJob: vi.fn().mockResolvedValue({
    jobId: "mock-job-12345",
    status: "queued",
    totalStudents: 25,
  }),
  getLocalJob: vi.fn(),
}));

// ── Fixture IDs ───────────────────────────────────────────────
const SCHOOL_ID = "school-apexium-001";
const TEACHER_A_ID = "teacher-alice-uuid";
const TEACHER_B_ID = "teacher-bob-uuid";
const CLASS_X_ID = "class-x-grade-10";
const CLASS_Y_ID = "class-y-grade-11";

// ── Mock Database ─────────────────────────────────────────────
vi.mock("@apexium/db", () => {
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn((table: any) => ({
          where: vi.fn((condition: any) => ({
            limit: vi.fn(() => {
              // We inspect table to provide accurate mock responses
              // 1. schools lookup
              if (table && table._ && table._.name === "schools") {
                return [{ id: SCHOOL_ID, name: "Apexium Model School", address: "10 Campus Way" }];
              }
              // 2. classes lookup for verifyTeacherClassAssignment or class info
              return [];
            }),
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => []),
            })),
          })),
        })),
      })),
    },
    schools: { id: "id", name: "name", address: "address", _: { name: "schools" } },
    classes: {
      id: "id",
      schoolId: "school_id",
      name: "name",
      classTeacherId: "class_teacher_id",
      _: { name: "classes" },
    },
    sections: {
      id: "id",
      schoolId: "school_id",
      classId: "class_id",
      classTeacherId: "class_teacher_id",
      _: { name: "sections" },
    },
    timetableEntries: {
      id: "id",
      schoolId: "school_id",
      classId: "class_id",
      teacherId: "teacher_id",
      _: { name: "timetable_entries" },
    },
    terms: { id: "id", schoolId: "school_id", name: "name", session: "session", _: { name: "terms" } },
    students: { id: "id", schoolId: "school_id" },
    studentScores: { id: "id", schoolId: "school_id" },
    subjects: { id: "id", schoolId: "school_id" },
    studentTermReports: { id: "id", schoolId: "school_id" },
    studentAttendance: { id: "id", schoolId: "school_id" },
    computeClassRankings: vi.fn().mockResolvedValue([]),
  };
});

import { db } from "@apexium/db";

describe("Teacher Class-Scoped Report Card Generation Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("REJECTS unauthenticated requests with HTTP 401 Unauthorized", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/reports/generate", {
      method: "POST",
      body: JSON.stringify({
        classId: CLASS_X_ID,
        academicSession: "2025/2026",
        termName: "First Term",
      }),
    });

    const res = await generateReports(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Unauthorized");
  });

  it("REJECTS student and parent callers with HTTP 403 Forbidden", async () => {
    // 1. Student caller
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "stu-1",
      schoolId: SCHOOL_ID,
      email: "student@school.ng",
      role: "student",
      firstName: "Emeka",
      lastName: "Okonkwo",
    });

    const studentReq = new NextRequest("http://localhost:3000/api/reports/generate", {
      method: "POST",
      body: JSON.stringify({
        classId: CLASS_X_ID,
        academicSession: "2025/2026",
        termName: "First Term",
      }),
    });

    const studentRes = await generateReports(studentReq);
    const studentJson = await studentRes.json();

    expect(studentRes.status).toBe(403);
    expect(studentJson.success).toBe(false);
    expect(studentJson.error).toContain("Forbidden");

    // 2. Parent caller
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "par-1",
      schoolId: SCHOOL_ID,
      email: "parent@school.ng",
      role: "parent",
      firstName: "Chukwudi",
      lastName: "Okonkwo",
    });

    const parentReq = new NextRequest("http://localhost:3000/api/reports/generate", {
      method: "POST",
      body: JSON.stringify({
        classId: CLASS_X_ID,
        academicSession: "2025/2026",
        termName: "First Term",
      }),
    });

    const parentRes = await generateReports(parentReq);
    const parentJson = await parentRes.json();

    expect(parentRes.status).toBe(403);
    expect(parentJson.success).toBe(false);
    expect(parentJson.error).toContain("Forbidden");
  });

  it("ALLOWS Teacher A to generate report cards for their own assigned Class X (HTTP 200 OK)", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: TEACHER_A_ID,
      schoolId: SCHOOL_ID,
      email: "teacher.alice@school.ng",
      role: "teacher",
      firstName: "Alice",
      lastName: "Teacher",
    });

    // Mock DB queries for Teacher A assigned to Class X
    vi.mocked(db.select).mockImplementation((() => ({
      from: vi.fn((table: any) => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            // schools table
            if (table && table._ && table._.name === "schools") {
              return [{ id: SCHOOL_ID, name: "Apexium Model School", address: "10 Campus Way" }];
            }
            // classes table: Teacher A is assigned to Class X
            if (table && table._ && table._.name === "classes") {
              return [{ id: CLASS_X_ID, name: "Grade 10", schoolId: SCHOOL_ID, classTeacherId: TEACHER_A_ID }];
            }
            return [];
          }),
        })),
      })),
    })) as any);

    const req = new NextRequest("http://localhost:3000/api/reports/generate", {
      method: "POST",
      body: JSON.stringify({
        classId: CLASS_X_ID,
        academicSession: "2025/2026",
        termName: "First Term",
        mockCount: 5,
      }),
    });

    const res = await generateReports(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.jobId).toBe("mock-job-12345");
    expect(json.data.status).toBe("queued");
  });

  it("STRICTLY REJECTS Teacher A when attempting to generate report cards for unassigned Class Y (HTTP 403 Forbidden)", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: TEACHER_A_ID,
      schoolId: SCHOOL_ID,
      email: "teacher.alice@school.ng",
      role: "teacher",
      firstName: "Alice",
      lastName: "Teacher",
    });

    // Mock DB queries: Teacher A is NOT assigned to Class Y (returns empty for class/section/timetable teacher checks)
    vi.mocked(db.select).mockImplementation((() => ({
      from: vi.fn((table: any) => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            // For class/section/timetable teacher assignment checks: no match!
            return [];
          }),
        })),
      })),
    })) as any);

    const req = new NextRequest("http://localhost:3000/api/reports/generate", {
      method: "POST",
      body: JSON.stringify({
        classId: CLASS_Y_ID, // Class Y belongs to someone else
        academicSession: "2025/2026",
        termName: "First Term",
        mockCount: 5,
      }),
    });

    const res = await generateReports(req);
    const json = await res.json();

    // MUST be rejected with HTTP 403 Forbidden
    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Forbidden: You are not assigned as a teacher for this class.");
  });

  it("ALLOWS School Admin to generate report cards for any class in the school (HTTP 200 OK)", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "admin-principal-1",
      schoolId: SCHOOL_ID,
      email: "admin@school.ng",
      role: "admin",
      firstName: "Tunde",
      lastName: "Principal",
    });

    // Mock DB queries for admin
    vi.mocked(db.select).mockImplementation((() => ({
      from: vi.fn((table: any) => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            if (table && table._ && table._.name === "schools") {
              return [{ id: SCHOOL_ID, name: "Apexium Model School", address: "10 Campus Way" }];
            }
            if (table && table._ && table._.name === "classes") {
              return [{ id: CLASS_Y_ID, name: "Grade 11", schoolId: SCHOOL_ID }];
            }
            return [];
          }),
        })),
      })),
    })) as any);

    const req = new NextRequest("http://localhost:3000/api/reports/generate", {
      method: "POST",
      body: JSON.stringify({
        classId: CLASS_Y_ID,
        academicSession: "2025/2026",
        termName: "First Term",
        mockCount: 5,
      }),
    });

    const res = await generateReports(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.jobId).toBe("mock-job-12345");
  });
});

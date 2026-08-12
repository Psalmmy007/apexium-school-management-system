/**
 * Milestone 33 — Data Privacy & NDPR Compliance Test Suite
 *
 * Tests:
 *  1. Consent recording & withdrawal
 *  2. Data retention policy upsert & retrieval
 *  3. Expired record flagging
 *  4. Data Subject Request (DSR) submit workflow
 *  5. DSR admin review workflow (status transitions)
 *  6. Sensitive field access control (role-based restriction)
 *  7. Cross-tenant isolation (School A data not accessible to School B admin)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "crypto";
import { db } from "../client";
import { schools, users, students } from "../schema/index";
import {
  recordConsent,
  withdrawConsent,
  getSchoolConsents,
  setRetentionPolicy,
  getRetentionPolicies,
  flagExpiredRecords,
  submitDataSubjectRequest,
  reviewDataSubjectRequest,
  getPendingRequests,
  assertSensitiveFieldAccess,
} from "./privacy";

describe("Milestone 33 — Data Privacy & NDPR Compliance", () => {
  let schoolAId: string;
  let schoolBId: string;
  let adminAId: string;
  let studentAId: string;
  let consentId: string;
  let dsrId: string;

  beforeAll(async () => {
    // ── Seed School A ────────────────────────────────────────────
    const [schoolA] = await db
      .insert(schools)
      .values({
        name: "Privacy Test School A",
        slug: `privacy-school-a-${Date.now()}`,
      })
      .returning();
    schoolAId = schoolA.id;

    const [adminA] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        schoolId: schoolAId,
        email: `admin.a.${Date.now()}@privacy.test`,
        firstName: "Admin",
        lastName: "A",
        role: "admin",
      })
      .returning();
    adminAId = adminA.id;

    const [studentA] = await db
      .insert(students)
      .values({
        schoolId: schoolAId,
        admissionNumber: `PRIV-${Date.now()}`,
        firstName: "Chidi",
        lastName: "Okeke",
        gender: "male",
      })
      .returning();
    studentAId = studentA.id;

    // ── Seed School B ────────────────────────────────────────────
    const [schoolB] = await db
      .insert(schools)
      .values({
        name: "Privacy Test School B",
        slug: `privacy-school-b-${Date.now()}`,
      })
      .returning();
    schoolBId = schoolB.id;
  });

  // ── Test 1: Consent recording ─────────────────────────────────
  it("records a consent grant for a student medical data category", async () => {
    const consent = await recordConsent({
      schoolId: schoolAId,
      dataSubjectId: studentAId,
      subjectType: "student",
      dataCategory: "medical",
      legalBasis: "consent",
      consentText: "Parent consents to storage of medical history for emergency use.",
      ipAddress: "192.168.1.1",
    });
    consentId = consent.id;
    expect(consent.status).toBe("active");
    expect(consent.dataCategory).toBe("medical");
    expect(consent.legalBasis).toBe("consent");
    expect(consent.schoolId).toBe(schoolAId);
  });

  // ── Test 2: Consent withdrawal ────────────────────────────────
  it("withdraws a consent and updates its status to withdrawn", async () => {
    const withdrawn = await withdrawConsent(consentId, schoolAId);
    expect(withdrawn.status).toBe("withdrawn");
    expect(withdrawn.withdrawnAt).not.toBeNull();
  });

  // ── Test 3: Retention policy upsert ──────────────────────────
  it("upserts a data retention policy for student_records (7 years)", async () => {
    const policy = await setRetentionPolicy({
      schoolId: schoolAId,
      dataCategory: "student_records",
      retentionYears: 7,
      legalBasisNote: "NDPR Article 9 — school records must be retained for 7 years.",
    });
    expect(policy.retentionYears).toBe(7);
    expect(policy.dataCategory).toBe("student_records");
    expect(policy.autoDeleteEnabled).toBe(false); // never auto-delete
  });

  // ── Test 4: Flag expired records ─────────────────────────────
  it("flags expired data categories based on retention periods", async () => {
    // Set a very short 0-year policy for attendance to force an expiry flag
    await setRetentionPolicy({
      schoolId: schoolAId,
      dataCategory: "attendance",
      retentionYears: 0,
    });
    const flaggedReport = await flagExpiredRecords(schoolAId);
    const attendanceFlag = flaggedReport.find((r) => r.category === "attendance");
    expect(attendanceFlag).toBeDefined();
  });

  // ── Test 5: Submit a Data Subject Request ─────────────────────
  it("allows a requester to submit a right-to-access DSR", async () => {
    const dsr = await submitDataSubjectRequest({
      schoolId: schoolAId,
      requesterEmail: "parent.chidi@example.com",
      requesterName: "Ngozi Okeke",
      requestType: "access",
      dataCategories: ["student_records", "attendance"],
      subjectId: studentAId,
    });
    dsrId = dsr.id;
    expect(dsr.status).toBe("pending");
    expect(dsr.requestType).toBe("access");
    expect(dsr.requesterEmail).toBe("parent.chidi@example.com");
  });

  // ── Test 6: Admin reviews DSR ─────────────────────────────────
  it("admin marks DSR as completed and adds notes", async () => {
    const reviewed = await reviewDataSubjectRequest({
      requestId: dsrId,
      schoolId: schoolAId,
      adminUserId: adminAId,
      status: "completed",
      adminNotes: "Full data package emailed to parent on 2026-08-12.",
    });
    expect(reviewed.status).toBe("completed");
    expect(reviewed.reviewedBy).toBe(adminAId);
    expect(reviewed.adminNotes).toContain("emailed to parent");
  });

  // ── Test 7: Sensitive field role restriction ───────────────────
  it("denies teacher access to medical sensitive field category", async () => {
    await expect(assertSensitiveFieldAccess("teacher", "medical")).rejects.toThrow(
      "Access denied"
    );
  });

  it("allows admin access to medical sensitive field category", async () => {
    await expect(assertSensitiveFieldAccess("admin", "medical")).resolves.toBeUndefined();
  });

  it("denies teacher access to financial_payroll sensitive field category", async () => {
    await expect(
      assertSensitiveFieldAccess("teacher", "financial_payroll")
    ).rejects.toThrow("Access denied");
  });

  // ── Test 8: Cross-tenant isolation ────────────────────────────
  it("School B admin cannot see School A data subject requests", async () => {
    const schoolBRequests = await getPendingRequests(schoolBId);
    // School B has zero DSRs — School A's DSR must NOT appear
    const schoolADsrInB = schoolBRequests.find((r) => r.id === dsrId);
    expect(schoolADsrInB).toBeUndefined();
  });
});

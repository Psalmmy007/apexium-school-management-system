/**
 * Milestone 34 — Public Admissions & Enrollment Intake Test Suite
 *
 * Tests:
 *  1. Application lifecycle (create -> submit -> review -> shortlist -> accept -> enroll)
 *  2. Application rejection (submit -> review -> reject)
 *  3. Application waitlist (submit -> review -> waitlist)
 *  4. Application withdrawal (submit -> withdraw)
 *  5. Document upload & verification
 *  6. Duplicate detection (by guardian email, phone, name+dob)
 *  7. Student conversion (creates student, guardian, links them, updates status to enrolled)
 *  8. Tenant isolation (School A cannot view/update/convert School B applications)
 *  9. Admissions statistics calculation
 */

import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "crypto";
import { db } from "../client";
import { eq } from "drizzle-orm";
import { schools, users, classes, admissionApplications, students, guardians, studentGuardians } from "../schema/index";
import {
  createAdmissionApplication,
  getAdmissionApplication,
  getAdmissionApplicationByReference,
  listAdmissionApplications,
  submitAdmissionApplication,
  reviewAdmissionApplication,
  shortlistApplicant,
  waitlistApplicant,
  acceptApplicant,
  rejectApplicant,
  withdrawApplication,
  uploadAdmissionDocument,
  verifyAdmissionDocument,
  convertApplicantToStudent,
  detectDuplicateApplication,
  getAdmissionStatistics,
} from "./admissions";

describe("Milestone 34 — Public Admissions & Enrollment Intake", () => {
  let schoolAId: string;
  let schoolBId: string;
  let adminAId: string;
  let classAId: string;
  let appA1Id: string;
  let appA2Id: string;
  let appB1Id: string;
  let refA1: string;

  beforeAll(async () => {
    // 1. Seed School A
    const [schoolA] = await db
      .insert(schools)
      .values({
        name: "Admissions Test School A",
        slug: `admissions-school-a-${Date.now()}`,
      })
      .returning();
    schoolAId = schoolA.id;

    // Admin A
    const [adminA] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        schoolId: schoolAId,
        email: `admin.adm.a.${Date.now()}@test.com`,
        firstName: "Admissions",
        lastName: "AdminA",
        role: "admin",
      })
      .returning();
    adminAId = adminA.id;

    // Class A
    const [clsA] = await db
      .insert(classes)
      .values({
        schoolId: schoolAId,
        name: "JSS 1 Gold",
      })
      .returning();
    classAId = clsA.id;

    // 2. Seed School B
    const [schoolB] = await db
      .insert(schools)
      .values({
        name: "Admissions Test School B",
        slug: `admissions-school-b-${Date.now()}`,
      })
      .returning();
    schoolBId = schoolB.id;

    // Admin B
    await db
      .insert(users)
      .values({
        id: randomUUID(),
        schoolId: schoolBId,
        email: `admin.adm.b.${Date.now()}@test.com`,
        firstName: "Admissions",
        lastName: "AdminB",
        role: "admin",
      });
  });

  // ── Test 1: Application creation & submission ─────────────────
  it("creates a draft application and submits it", async () => {
    const app = await createAdmissionApplication({
      schoolId: schoolAId,
      firstName: "Kola",
      middleName: "Bamidele",
      lastName: "Adeyemi",
      dateOfBirth: new Date("2012-05-15"),
      gender: "male",
      nationality: "Nigerian",
      currentSchool: "St. Jude Primary",
      desiredClassId: classAId,
      desiredSession: "2026/2027",
      guardianName: "Oluwaseun Adeyemi",
      guardianRelationship: "father",
      guardianEmail: "oluwaseun.adeyemi@example.com",
      guardianPhone: "+2348031112233",
      guardianAddress: "12 Ikeja Way, Lagos",
      source: "online",
    });

    appA1Id = app.id;
    refA1 = app.applicationReference;

    expect(app.status).toBe("draft");
    expect(app.applicationReference).toBeDefined();

    // Submit
    const submitted = await submitAdmissionApplication(app.id, schoolAId);
    expect(submitted.status).toBe("submitted");
    expect(submitted.submittedAt).not.toBeNull();
  });

  // ── Test 2: Workflow status transitions (Review -> Shortlist -> Accept) ──
  it("transitions application through review, shortlist, and accept states", async () => {
    const underReview = await reviewAdmissionApplication(appA1Id, schoolAId, adminAId);
    expect(underReview.status).toBe("under_review");
    expect(underReview.reviewedBy).toBe(adminAId);

    const shortlisted = await shortlistApplicant(appA1Id, schoolAId, adminAId);
    expect(shortlisted.status).toBe("shortlisted");

    const accepted = await acceptApplicant(appA1Id, schoolAId, adminAId);
    expect(accepted.status).toBe("accepted");
  });

  // ── Test 3: Document Upload & Verification ───────────────────
  it("uploads and verifies an admission document", async () => {
    const doc = await uploadAdmissionDocument({
      applicationId: appA1Id,
      schoolId: schoolAId,
      documentType: "birth_certificate",
      fileName: "kola_birth_cert.pdf",
      storagePath: "admissions/kola_birth_cert.pdf",
      fileSizeBytes: 102450,
      mimeType: "application/pdf",
    });

    expect(doc.verificationStatus).toBe("pending");

    const verified = await verifyAdmissionDocument(doc.id, schoolAId, adminAId);
    expect(verified.verificationStatus).toBe("verified");
    expect(verified.verifiedBy).toBe(adminAId);
  });

  // ── Test 4: Student conversion ───────────────────────────────
  it("converts an accepted applicant into a real student and guardian record", async () => {
    const result = await convertApplicantToStudent({
      applicationId: appA1Id,
      schoolId: schoolAId,
      adminId: adminAId,
    });

    expect(result.student).toBeDefined();
    expect(result.student.firstName).toBe("Kola");
    expect(result.student.lastName).toBe("Adeyemi");
    expect(result.student.classId).toBe(classAId);
    expect(result.student.status).toBe("active");

    expect(result.guardian).toBeDefined();
    expect(result.guardian.phone).toBe("+2348031112233");

    expect(result.application.status).toBe("enrolled");
    expect(result.application.convertedStudentId).toBe(result.student.id);

    // Verify student and guardian are linked in DB
    const [link] = await db
      .select()
      .from(studentGuardians)
      .where(eq(studentGuardians.studentId, result.student.id));

    expect(link).toBeDefined();
    expect(link.guardianId).toBe(result.guardian.id);
  });

  // ── Test 5: Rejection workflow ────────────────────────────────
  it("handles application rejection with reason", async () => {
    const app = await createAdmissionApplication({
      schoolId: schoolAId,
      firstName: "Tolu",
      lastName: "Ojo",
      dateOfBirth: new Date("2013-08-20"),
      gender: "female",
      guardianName: "Funke Ojo",
      guardianRelationship: "mother",
      guardianEmail: "funke.ojo@example.com",
      guardianPhone: "+2348029998877",
    });

    await submitAdmissionApplication(app.id, schoolAId);
    await reviewAdmissionApplication(app.id, schoolAId, adminAId);

    const rejected = await rejectApplicant(app.id, schoolAId, adminAId, "Failed entry assessment test");
    expect(rejected.status).toBe("rejected");
    expect(rejected.rejectionReason).toBe("Failed entry assessment test");
  });

  // ── Test 6: Waitlist workflow ─────────────────────────────────
  it("handles application waitlist with reason", async () => {
    const app = await createAdmissionApplication({
      schoolId: schoolAId,
      firstName: "Emeka",
      lastName: "Nnamdi",
      dateOfBirth: new Date("2012-01-10"),
      gender: "male",
      guardianName: "Chidi Nnamdi",
      guardianRelationship: "father",
      guardianEmail: "chidi.nnamdi@example.com",
      guardianPhone: "+2348054443322",
    });

    await submitAdmissionApplication(app.id, schoolAId);
    await reviewAdmissionApplication(app.id, schoolAId, adminAId);

    const waitlisted = await waitlistApplicant(app.id, schoolAId, adminAId, "Class at maximum capacity");
    expect(waitlisted.status).toBe("waitlisted");
    expect(waitlisted.waitlistReason).toBe("Class at maximum capacity");
  });

  // ── Test 7: Withdrawal workflow ───────────────────────────────
  it("allows an applicant to withdraw their application", async () => {
    const app = await createAdmissionApplication({
      schoolId: schoolAId,
      firstName: "Bisi",
      lastName: "Akande",
      dateOfBirth: new Date("2011-11-11"),
      gender: "female",
      guardianName: "Sola Akande",
      guardianRelationship: "mother",
      guardianEmail: "sola.akande@example.com",
      guardianPhone: "+2348076665544",
    });

    await submitAdmissionApplication(app.id, schoolAId);
    const withdrawn = await withdrawApplication(app.id, schoolAId);
    expect(withdrawn.status).toBe("withdrawn");
  });

  // ── Test 8: Duplicate application detection ────────────────────
  it("detects potential duplicate applications by guardian email/phone and student name", async () => {
    // Add another application with same guardian email
    const duplicateApp = await createAdmissionApplication({
      schoolId: schoolAId,
      firstName: "Kola",
      lastName: "Adeyemi",
      dateOfBirth: new Date("2012-05-15"),
      gender: "male",
      guardianName: "Oluwaseun Adeyemi",
      guardianRelationship: "father",
      guardianEmail: "oluwaseun.adeyemi@example.com",
      guardianPhone: "+2348031112233",
    });

    const duplicates = await detectDuplicateApplication({
      schoolId: schoolAId,
      guardianEmail: "oluwaseun.adeyemi@example.com",
      guardianPhone: "+2348031112233",
      firstName: "Kola",
      lastName: "Adeyemi",
      dateOfBirth: new Date("2012-05-15"),
    });

    expect(duplicates.length).toBeGreaterThan(0);
    const match = duplicates.find((d) => d.application.id === appA1Id);
    expect(match).toBeDefined();
    expect(match?.matchReasons).toContain("email");
  });

  // ── Test 9: Tenant isolation ──────────────────────────────────
  it("enforces strict multi-tenant isolation (School B cannot access School A applications)", async () => {
    // School B application
    const appB = await createAdmissionApplication({
      schoolId: schoolBId,
      firstName: "Fatima",
      lastName: "Bello",
      dateOfBirth: new Date("2013-03-03"),
      gender: "female",
      guardianName: "Ibrahim Bello",
      guardianRelationship: "father",
      guardianEmail: "ibrahim.bello@example.com",
      guardianPhone: "+2348091118888",
    });

    appB1Id = appB.id;

    // School A trying to access School B application -> returns null
    const schoolAViewOfB = await getAdmissionApplication(appB1Id, schoolAId);
    expect(schoolAViewOfB).toBeNull();

    // School A list applications -> contains 0 applications from School B
    const schoolAList = await listAdmissionApplications({ schoolId: schoolAId });
    const bInA = schoolAList.data.find((a) => a.id === appB1Id);
    expect(bInA).toBeUndefined();

    // School A statistics -> only counts School A applications
    const statsA = await getAdmissionStatistics(schoolAId);
    const statsB = await getAdmissionStatistics(schoolBId);

    expect(statsA.total).toBeGreaterThan(0);
    expect(statsB.total).toBe(1);
  });
});

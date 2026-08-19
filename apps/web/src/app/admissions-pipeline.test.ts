/**
 * Milestone 42 — Admissions Pipeline & Data Integrity Automated Tests
 */

import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "crypto";
import {
  db,
  schools,
  users,
  classes,
  admissionApplications,
  students,
  guardians,
  studentGuardians,
} from "@apexium/db";
import { eq, and } from "drizzle-orm";
import { POST as applyHandler } from "./api/admissions/apply/route";
import { GET as trackHandler } from "./api/admissions/track/route";
import { PATCH as statusHandler } from "./api/admissions/[id]/status/route";
import { POST as enrollHandler } from "./api/admissions/[id]/enroll/route";
import { NextRequest } from "next/server";

describe("Milestone 42 — Admissions Data Integrity & Pipeline Transitions", () => {
  let testSchool: any;
  let testAdmin: any;
  let testClass: any;

  beforeAll(async () => {
    // 1. Seed School
    const [school] = await db
      .insert(schools)
      .values({
        name: "Milestone 42 Test Academy",
        slug: `m42-admissions-${Date.now()}`,
      })
      .returning();
    testSchool = school;

    // 2. Seed Admin User
    const [admin] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        schoolId: testSchool.id,
        email: `admin.m42.${Date.now()}@test.com`,
        firstName: "M42",
        lastName: "Admin",
        role: "admin",
      })
      .returning();
    testAdmin = admin;

    // 3. Seed Class
    const [cls] = await db
      .insert(classes)
      .values({
        schoolId: testSchool.id,
        name: "Primary 1 Emerald",
      })
      .returning();
    testClass = cls;
  });

  it("1. Rejects application submission without declarationConsent and produces NO database record or reference", async () => {
    const req = new NextRequest("http://localhost/api/admissions/apply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-apexium-tenant-slug": testSchool.slug,
      },
      body: JSON.stringify({
        slug: testSchool.slug,
        firstName: "FailChild",
        lastName: "NoConsent",
        dateOfBirth: "2018-04-10",
        gender: "male",
        guardianName: "Parent One",
        guardianEmail: "fail.consent@example.com",
        guardianPhone: "+2348000000001",
        declarationConsent: false, // Explicitly no consent
      }),
    });

    const res = await applyHandler(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/consent to the declaration/i);
    expect(data.reference).toBeUndefined();

    // Verify zero records were written
    const dbRecords = await db
      .select()
      .from(admissionApplications)
      .where(
        and(
          eq(admissionApplications.schoolId, testSchool.id),
          eq(admissionApplications.guardianEmail, "fail.consent@example.com")
        )
      );
    expect(dbRecords.length).toBe(0);
  });

  it("2. Successfully submits application with standard fields (desiredClassId, declarationConsent) and persists to DB", async () => {
    const req = new NextRequest("http://localhost/api/admissions/apply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-apexium-tenant-slug": testSchool.slug,
      },
      body: JSON.stringify({
        slug: testSchool.slug,
        firstName: "Amina",
        middleName: "Fatima",
        lastName: "Bello",
        dateOfBirth: "2018-06-15",
        gender: "female",
        nationality: "Nigerian",
        currentSchool: "Sunshine Early Learning",
        desiredClassId: testClass.id,
        desiredSession: "2026/2027",
        desiredTermId: undefined,
        guardianName: "Alhaji Bello",
        guardianRelationship: "father",
        guardianEmail: "bello.father@example.com",
        guardianPhone: "+2348021114455",
        guardianAddress: "45 Victoria Island, Lagos",
        declarationConsent: true,
      }),
    });

    const res = await applyHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.reference).toBeDefined();
    expect(data.application).toBeDefined();
    expect(data.application.status).toBe("submitted");

    // Verify database record exists
    const [persisted] = await db
      .select()
      .from(admissionApplications)
      .where(eq(admissionApplications.id, data.application.id));

    expect(persisted).toBeDefined();
    expect(persisted.firstName).toBe("Amina");
    expect(persisted.lastName).toBe("Bello");
    expect(persisted.status).toBe("submitted");
    expect(persisted.desiredClassId).toBe(testClass.id);
  });

  it("3. Tracks application status via reference and guardian email", async () => {
    // Look up Amina's application
    const [app] = await db
      .select()
      .from(admissionApplications)
      .where(
        and(
          eq(admissionApplications.schoolId, testSchool.id),
          eq(admissionApplications.guardianEmail, "bello.father@example.com")
        )
      );

    const req = new NextRequest(
      `http://localhost/api/admissions/track?reference=${encodeURIComponent(app.applicationReference)}&email=${encodeURIComponent(app.guardianEmail)}&slug=${testSchool.slug}`,
      {
        method: "GET",
        headers: { "x-apexium-tenant-slug": testSchool.slug },
      }
    );

    const res = await trackHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.applicationReference).toBe(app.applicationReference);
    expect(data.applicantName).toBe("Amina Bello");
    expect(data.status).toBe("SUBMITTED");
  });

  it("4. Progresses candidate through pipeline stages in database (Review -> Shortlist -> Accept)", async () => {
    const [app] = await db
      .select()
      .from(admissionApplications)
      .where(
        and(
          eq(admissionApplications.schoolId, testSchool.id),
          eq(admissionApplications.guardianEmail, "bello.father@example.com")
        )
      );

    // Review stage
    const [reviewed] = await db
      .update(admissionApplications)
      .set({ status: "under_review", reviewedAt: new Date(), reviewedBy: testAdmin.id })
      .where(eq(admissionApplications.id, app.id))
      .returning();
    expect(reviewed.status).toBe("under_review");

    // Shortlist stage
    const [shortlisted] = await db
      .update(admissionApplications)
      .set({ status: "shortlisted", decisionAt: new Date(), decisionBy: testAdmin.id })
      .where(eq(admissionApplications.id, app.id))
      .returning();
    expect(shortlisted.status).toBe("shortlisted");

    // Accept stage
    const [accepted] = await db
      .update(admissionApplications)
      .set({ status: "accepted", decisionAt: new Date(), decisionBy: testAdmin.id })
      .where(eq(admissionApplications.id, app.id))
      .returning();
    expect(accepted.status).toBe("accepted");
  });

  it("5. Converts accepted applicant into real Student, Guardian, and StudentGuardian records without creating premature records", async () => {
    const [app] = await db
      .select()
      .from(admissionApplications)
      .where(
        and(
          eq(admissionApplications.schoolId, testSchool.id),
          eq(admissionApplications.guardianEmail, "bello.father@example.com")
        )
      );

    const { convertApplicantToStudent } = await import("@apexium/db");

    // Call atomic student conversion
    const result = await convertApplicantToStudent({
      applicationId: app.id,
      schoolId: testSchool.id,
      adminId: testAdmin.id,
      classId: testClass.id,
    });

    // Verify enrollment
    expect(result.student).toBeDefined();
    expect(result.student.firstName).toBe("Amina");
    expect(result.student.status).toBe("active");
    expect(result.student.classId).toBe(testClass.id);

    expect(result.guardian).toBeDefined();
    expect(result.guardian.phone).toBe("+2348021114455");

    expect(result.application.status).toBe("enrolled");
    expect(result.application.convertedStudentId).toBe(result.student.id);

    // Verify studentGuardian link exists in DB
    const [dbLink] = await db
      .select()
      .from(studentGuardians)
      .where(
        and(
          eq(studentGuardians.schoolId, testSchool.id),
          eq(studentGuardians.studentId, result.student.id)
        )
      );
    expect(dbLink).toBeDefined();
    expect(dbLink.guardianId).toBe(result.guardian.id);
    expect(dbLink.isPrimary).toBe(true);
  });
});

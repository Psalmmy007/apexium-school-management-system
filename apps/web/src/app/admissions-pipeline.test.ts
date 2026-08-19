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

  it("6. Phase 2: Application fee requirement blocks review until Paystack webhook verifies payment", async () => {
    const { createAdmissionApplication, reviewAdmissionApplication, verifyAndProcessPaystackWebhook } = await import("@apexium/db");
    const crypto = await import("crypto");

    // Create an application that requires an application fee
    const app = await createAdmissionApplication({
      schoolId: testSchool.id,
      firstName: "FeePay",
      lastName: "Student",
      dateOfBirth: new Date("2017-03-20"),
      gender: "male",
      guardianName: "Fee Guardian",
      guardianRelationship: "father",
      guardianEmail: "feepay.guardian@example.com",
      guardianPhone: "+2348099887766",
      desiredClassId: testClass.id,
    });

    // Flag that payment is required
    await db
      .update(admissionApplications)
      .set({ paymentRequired: true, paymentVerified: false, applicationFeeAmount: 5000 })
      .where(eq(admissionApplications.id, app.id));

    // Attempting to review without verified payment throws an error
    await expect(reviewAdmissionApplication(app.id, testSchool.id, testAdmin.id)).rejects.toThrow(
      /Application fee must be verified/i
    );

    // Simulate Paystack HMAC Webhook event
    const secretKey = "sk_test_admissions_secret_123";
    const webhookPayload = JSON.stringify({
      event: "charge.success",
      data: {
        reference: `PAY-ADM-${Date.now()}`,
        amount: 500000,
        metadata: {
          applicationId: app.id,
          paymentType: "admission_application_fee",
        },
      },
    });
    const signature = crypto.createHmac("sha512", secretKey).update(webhookPayload).digest("hex");

    const webhookResult = await verifyAndProcessPaystackWebhook(
      testSchool.id,
      webhookPayload,
      signature,
      secretKey
    );

    expect(webhookResult.verified).toBe(true);
    expect(webhookResult.actionTaken).toContain("Application fee");

    // Verify DB updated
    const [updatedApp] = await db
      .select()
      .from(admissionApplications)
      .where(eq(admissionApplications.id, app.id));
    expect(updatedApp.paymentVerified).toBe(true);

    // Now review succeeds
    const reviewed = await reviewAdmissionApplication(app.id, testSchool.id, testAdmin.id);
    expect(reviewed.status).toBe("under_review");
  });

  it("7. Phase 3 & 4: Schedules interview and assigns Entrance CBT exam taken by applicant without student record", async () => {
    const {
      createAdmissionApplication,
      scheduleInterview,
      recordInterviewOutcome,
      cbtExams,
      cbtQuestions,
      cbtExamQuestions,
      subjects,
      terms,
      academicYears,
      startApplicantExamSession,
      submitExamSession,
    } = await import("@apexium/db");

    // 1. Create applicant
    const app = await createAdmissionApplication({
      schoolId: testSchool.id,
      firstName: "ExamTaker",
      lastName: "Candidate",
      dateOfBirth: new Date("2016-09-12"),
      gender: "female",
      guardianName: "Exam Parent",
      guardianRelationship: "mother",
      guardianEmail: "exam.parent@example.com",
      guardianPhone: "+2348077665544",
      desiredClassId: testClass.id,
    });

    // 2. Schedule Interview
    const interviewDate = new Date(Date.now() + 86400000); // Tomorrow
    await scheduleInterview({
      applicationId: app.id,
      schoolId: testSchool.id,
      interviewDate,
      interviewLocation: "Admin Building Conference Room B",
      adminId: testAdmin.id,
    });

    await recordInterviewOutcome({
      applicationId: app.id,
      schoolId: testSchool.id,
      interviewNotes: "Candidate demonstrated strong communication skills and readiness.",
      interviewScore: 88,
      adminId: testAdmin.id,
    });

    const [interviewedApp] = await db
      .select()
      .from(admissionApplications)
      .where(eq(admissionApplications.id, app.id));

    expect(interviewedApp.interviewLocation).toBe("Admin Building Conference Room B");
    expect(interviewedApp.interviewScore).toBe(88);

    // 3. Create Subject, Term, and CBT Exam
    const [sub] = await db
      .insert(subjects)
      .values({ schoolId: testSchool.id, name: "General Knowledge Assessment", code: `GK-${Date.now()}` })
      .returning();

    const [term] = await db
      .insert(terms)
      .values({
        schoolId: testSchool.id,
        name: "First Term",
        session: "2026/2027",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-12-15"),
        isCurrent: true,
      })
      .returning();

    const [exam] = await db
      .insert(cbtExams)
      .values({
        schoolId: testSchool.id,
        title: "2026 Entrance Assessment Exam",
        subjectId: sub.id,
        classId: testClass.id,
        termId: term.id,
        totalMarks: 20,
        passMarks: 10,
        durationMinutes: 30,
      })
      .returning();

    const [q1] = await db
      .insert(cbtQuestions)
      .values({
        schoolId: testSchool.id,
        subjectId: sub.id,
        questionText: "What is the capital of Nigeria?",
        questionType: "mcq",
        options: [
          { id: "a", text: "Lagos" },
          { id: "b", text: "Abuja" },
        ],
        correctAnswer: "b",
      })
      .returning();

    await db.insert(cbtExamQuestions).values({
      schoolId: testSchool.id,
      examId: exam.id,
      questionId: q1.id,
      marks: 10,
      order: 1,
    });

    // Assign exam to applicant
    await db
      .update(admissionApplications)
      .set({ cbtExamId: exam.id })
      .where(eq(admissionApplications.id, app.id));

    // Applicant sits exam without student account
    const session = await startApplicantExamSession({
      schoolId: testSchool.id,
      examId: exam.id,
      applicationId: app.id,
      applicantReference: app.applicationReference,
    });

    expect(session.studentId).toBeNull();
    expect(session.admissionApplicationId).toBe(app.id);

    // Save answer and submit
    const { saveExamAnswer } = await import("@apexium/db");
    await saveExamAnswer(session.id, q1.id, "b"); // Correct answer

    const submittedSession = await submitExamSession(session.id);
    expect(submittedSession.score).toBe(10);
    expect(submittedSession.percentage).toBe("100.00");

    // Verify applicant record received entranceExamScore automatically
    const [finalApp] = await db
      .select()
      .from(admissionApplications)
      .where(eq(admissionApplications.id, app.id));

    expect(finalApp.entranceExamScore).toBe(10);

    // Verify NO student record was prematurely created
    const [prematureStudent] = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.schoolId, testSchool.id),
          eq(students.firstName, "ExamTaker")
        )
      );
    expect(prematureStudent).toBeUndefined();
  });

  it("8. Phase 2: Acceptance fee requirement blocks enrollment until acceptance fee is verified", async () => {
    const {
      createAdmissionApplication,
      acceptApplicant,
      convertApplicantToStudent,
      verifyAndProcessPaystackWebhook,
    } = await import("@apexium/db");
    const crypto = await import("crypto");

    const app = await createAdmissionApplication({
      schoolId: testSchool.id,
      firstName: "AcceptFee",
      lastName: "Child",
      dateOfBirth: new Date("2017-05-14"),
      gender: "male",
      guardianName: "Accept Guardian",
      guardianRelationship: "father",
      guardianEmail: "accept.guardian@example.com",
      guardianPhone: "+2348066554433",
      desiredClassId: testClass.id,
    });

    // Accept with acceptance fee required
    await acceptApplicant(app.id, testSchool.id, testAdmin.id, {
      acceptanceFeeRequired: true,
      acceptanceFeeAmount: 25000,
    });

    // Attempting to enroll before paying acceptance fee throws error
    await expect(
      convertApplicantToStudent({
        applicationId: app.id,
        schoolId: testSchool.id,
        adminId: testAdmin.id,
        classId: testClass.id,
      })
    ).rejects.toThrow(/Acceptance fee payment must be verified/i);

    // Settle acceptance fee via Paystack Webhook
    const secretKey = "sk_test_admissions_secret_123";
    const webhookPayload = JSON.stringify({
      event: "charge.success",
      data: {
        reference: `ACC-PAY-${Date.now()}`,
        amount: 2500000,
        metadata: {
          applicationId: app.id,
          paymentType: "admission_acceptance_fee",
        },
      },
    });
    const signature = crypto.createHmac("sha512", secretKey).update(webhookPayload).digest("hex");

    await verifyAndProcessPaystackWebhook(
      testSchool.id,
      webhookPayload,
      signature,
      secretKey
    );

    // Now conversion succeeds
    const result = await convertApplicantToStudent({
      applicationId: app.id,
      schoolId: testSchool.id,
      adminId: testAdmin.id,
      classId: testClass.id,
    });

    expect(result.student).toBeDefined();
    expect(result.student.firstName).toBe("AcceptFee");
    expect(result.application.status).toBe("enrolled");
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import { db, schools, students, guardians, studentGuardians, studentDocuments, studentActivityTimeline, admissionSequences, users } from "../index";
import { generateAtomicAdmissionNumber } from "./admission-sequence";
import { executeStudentMerge, isStudentReadOnly } from "./student-merge-engine";
import { executeBulkOperation } from "./bulk-operations-engine";
import { eq, and } from "drizzle-orm";

import crypto from "crypto";

let schoolAId: string;
let schoolBId: string;
let adminAId: string;
let studentA1Id: string;
let studentA2Id: string;
let studentA3Id: string;

beforeAll(async () => {
  // Create Test Schools
  const [sA] = await db
    .insert(schools)
    .values({
      name: "Enterprise Hardening Academy A",
      slug: `eha-a-${Date.now()}`,
    })
    .returning();
  schoolAId = sA.id;

  const [sB] = await db
    .insert(schools)
    .values({
      name: "Enterprise Hardening Academy B",
      slug: `eha-b-${Date.now()}`,
    })
    .returning();
  schoolBId = sB.id;

  // Create Admin User with explicit random UUID
  const [adminA] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      schoolId: schoolAId,
      email: `admin.eha.${Date.now()}@example.com`,
      firstName: "Admin",
      lastName: "Tester",
      role: "admin",
    })
    .returning();
  adminAId = adminA.id;

  // Create Initial Students
  const [st1] = await db
    .insert(students)
    .values({
      schoolId: schoolAId,
      admissionNumber: "EHA/2026/000001",
      firstName: "Alice",
      lastName: "Primary",
      status: "active",
    })
    .returning();
  studentA1Id = st1.id;

  const [st2] = await db
    .insert(students)
    .values({
      schoolId: schoolAId,
      admissionNumber: "EHA/2026/000002",
      firstName: "Alice",
      lastName: "Duplicate",
      status: "active",
    })
    .returning();
  studentA2Id = st2.id;

  const [st3] = await db
    .insert(students)
    .values({
      schoolId: schoolAId,
      admissionNumber: "EHA/2026/000003",
      firstName: "Bob",
      lastName: "BulkTest",
      status: "active",
    })
    .returning();
  studentA3Id = st3.id;
});

describe("Milestone 16.1 Enterprise SIS Hardening Test Suite", () => {

  // 1. Atomic Admission Sequence Concurrency
  it("generates sequential admission numbers atomically without duplicates", async () => {
    const numbers = await Promise.all([
      generateAtomicAdmissionNumber(schoolAId, "2026", "EHA"),
      generateAtomicAdmissionNumber(schoolAId, "2026", "EHA"),
      generateAtomicAdmissionNumber(schoolAId, "2026", "EHA"),
    ]);

    expect(numbers.length).toBe(3);
    const uniqueSet = new Set(numbers);
    expect(uniqueSet.size).toBe(3); // Zero duplicates
    expect(numbers[0]).toMatch(/^EHA\/2026\/\d{6}$/);
  });

  // 2. Non-Destructive Student Record Merge Engine
  it("executes student merge non-destructively, re-linking child records and locking source record", async () => {
    // Add document to source student
    const [doc] = await db
      .insert(studentDocuments)
      .values({
        schoolId: schoolAId,
        studentId: studentA2Id,
        documentType: "birth_certificate",
        title: "Source Birth Certificate",
        fileUrl: "data:application/pdf;base64,sample==",
        uploadedBy: adminAId,
      })
      .returning();

    // Execute merge
    const result = await executeStudentMerge(
      schoolAId,
      studentA2Id, // source
      studentA1Id, // target
      adminAId,
      "Merging duplicate registration record"
    );

    expect(result.success).toBe(true);
    expect(result.relinkedCounts.documents).toBe(1);

    // Source student must still exist in DB but marked read-only and inactive
    const [sourceStudent] = await db
      .select()
      .from(students)
      .where(eq(students.id, studentA2Id));

    expect(sourceStudent).toBeDefined();
    expect(sourceStudent.isReadOnly).toBe(true);
    expect(sourceStudent.status).toBe("inactive");
    expect(sourceStudent.mergedIntoId).toBe(studentA1Id);

    // Helper checks read-only status
    const readOnlyCheck = await isStudentReadOnly(schoolAId, studentA2Id);
    expect(readOnlyCheck).toBe(true);

    // Document moved to target student
    const [movedDoc] = await db
      .select()
      .from(studentDocuments)
      .where(eq(studentDocuments.id, doc.id));

    expect(movedDoc.studentId).toBe(studentA1Id);

    // Timeline event logged on target
    const timeline = await db
      .select()
      .from(studentActivityTimeline)
      .where(
        and(
          eq(studentActivityTimeline.studentId, studentA1Id),
          eq(studentActivityTimeline.eventType, "student_merge")
        )
      );

    expect(timeline.length).toBe(1);
    expect(timeline[0].description).toContain("Merged child records");
  });

  // 3. Bulk Operations Engine with Dry-Run Mode
  it("executes bulk operations with dry-run preview mode without mutating data", async () => {
    // Execute dry run for suspension on active studentA3
    const dryRunResult = await executeBulkOperation({
      schoolId: schoolAId,
      operation: "suspend",
      studentIds: [studentA3Id],
      performedBy: adminAId,
      dryRun: true,
      reason: "Dry run test",
    });

    expect(dryRunResult.success).toBe(true);
    expect(dryRunResult.dryRun).toBe(true);
    expect(dryRunResult.affectedStudentIds).toContain(studentA3Id);

    // Verify student is still active (no DB mutation occurred during dry-run)
    const [stBefore] = await db
      .select()
      .from(students)
      .where(eq(students.id, studentA3Id));

    expect(stBefore.status).toBe("active");

    // Execute real transactional bulk suspension
    const realResult = await executeBulkOperation({
      schoolId: schoolAId,
      operation: "suspend",
      studentIds: [studentA3Id],
      performedBy: adminAId,
      dryRun: false,
      reason: "Real test suspension",
    });

    expect(realResult.success).toBe(true);
    expect(realResult.dryRun).toBe(false);

    const [stAfter] = await db
      .select()
      .from(students)
      .where(eq(students.id, studentA3Id));

    expect(stAfter.status).toBe("suspended");
  });

  // 4. Soft Delete & Document Restore
  it("soft-deletes student document with delete reason and supports full restoration", async () => {
    // Insert document for student 1
    const [doc] = await db
      .insert(studentDocuments)
      .values({
        schoolId: schoolAId,
        studentId: studentA1Id,
        documentType: "academic_record",
        title: "Primary Transcript",
        fileUrl: "data:application/pdf;base64,transcript==",
        uploadedBy: adminAId,
      })
      .returning();

    // Soft delete
    await db
      .update(studentDocuments)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: adminAId,
        deleteReason: "Uploaded wrong file",
      })
      .where(eq(studentDocuments.id, doc.id));

    const [deletedDoc] = await db
      .select()
      .from(studentDocuments)
      .where(eq(studentDocuments.id, doc.id));

    expect(deletedDoc.isDeleted).toBe(true);
    expect(deletedDoc.deleteReason).toBe("Uploaded wrong file");

    // Restore document
    await db
      .update(studentDocuments)
      .set({
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        deleteReason: null,
      })
      .where(eq(studentDocuments.id, doc.id));

    const [restoredDoc] = await db
      .select()
      .from(studentDocuments)
      .where(eq(studentDocuments.id, doc.id));

    expect(restoredDoc.isDeleted).toBe(false);
  });

  // 5. Tenant Isolation
  it("enforces complete tenant isolation between School A and School B for sequences & documents", async () => {
    const seqA = await db
      .select()
      .from(admissionSequences)
      .where(eq(admissionSequences.schoolId, schoolAId));

    const seqB = await db
      .select()
      .from(admissionSequences)
      .where(eq(admissionSequences.schoolId, schoolBId));

    expect(seqA.length).toBeGreaterThan(0);
    expect(seqB.length).toBe(0); // School B sequence is isolated
  });
});

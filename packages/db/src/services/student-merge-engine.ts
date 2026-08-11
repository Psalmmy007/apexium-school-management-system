import {
  db,
  students,
  studentAttendance,
  studentScores,
  feeInvoices,
  studentDocuments,
  studentGuardians,
  hostelAllocations,
  cbtExamSessions,
  lmsSubmissions,
  libraryLoans,
  studentActivityTimeline,
} from "../index";
import { eq, and } from "drizzle-orm";

export interface StudentMergeResult {
  success: boolean;
  sourceStudentId: string;
  targetStudentId: string;
  relinkedCounts: {
    attendance: number;
    scores: number;
    invoices: number;
    documents: number;
    guardians: number;
    hostel: number;
    cbt: number;
    lms: number;
    library: number;
  };
  message: string;
}

/**
 * Non-destructive Student Merge Engine.
 * Re-links all child records from source to target student while keeping the source record intact.
 * Source student is marked read-only (isReadOnly=true, status='inactive', mergedIntoId=targetStudentId).
 * Logs merge events to both activity timelines.
 * Compatible with Supabase PgBouncer pooler (port 6543).
 */
export async function executeStudentMerge(
  schoolId: string,
  sourceStudentId: string,
  targetStudentId: string,
  performedBy: string,
  reason: string
): Promise<StudentMergeResult> {
  if (sourceStudentId === targetStudentId) {
    throw new Error("Source and target student IDs cannot be the same.");
  }

  if (!reason || reason.trim().length < 5) {
    throw new Error("A detailed reason (at least 5 characters) is required to execute a student merge.");
  }

  // 1. Verify both students exist and belong to the specified tenant
  const [sourceStudent] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, sourceStudentId), eq(students.schoolId, schoolId)));

  const [targetStudent] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, targetStudentId), eq(students.schoolId, schoolId)));

  if (!sourceStudent) throw new Error("Source student not found or belongs to a different school.");
  if (!targetStudent) throw new Error("Target student not found or belongs to a different school.");

  if (sourceStudent.isReadOnly) {
    throw new Error(`Source student "${sourceStudent.firstName} ${sourceStudent.lastName}" is already merged/read-only and cannot be merged again.`);
  }

  // 2. Re-link child records to target student safely
  // A. Attendance
  const relinkedAttendance = await db
    .update(studentAttendance)
    .set({ studentId: targetStudentId })
    .where(and(eq(studentAttendance.studentId, sourceStudentId), eq(studentAttendance.schoolId, schoolId)))
    .returning();

  // B. Academic Scores
  const relinkedScores = await db
    .update(studentScores)
    .set({ studentId: targetStudentId })
    .where(and(eq(studentScores.studentId, sourceStudentId), eq(studentScores.schoolId, schoolId)))
    .returning();

  // C. Fee Invoices
  const relinkedInvoices = await db
    .update(feeInvoices)
    .set({ studentId: targetStudentId })
    .where(and(eq(feeInvoices.studentId, sourceStudentId), eq(feeInvoices.schoolId, schoolId)))
    .returning();

  // D. Documents
  const relinkedDocuments = await db
    .update(studentDocuments)
    .set({ studentId: targetStudentId })
    .where(and(eq(studentDocuments.studentId, sourceStudentId), eq(studentDocuments.schoolId, schoolId)))
    .returning();

  // E. Guardians (ignore unique constraint conflicts if already linked)
  let relinkedGuardians: any[] = [];
  try {
    relinkedGuardians = await db
      .update(studentGuardians)
      .set({ studentId: targetStudentId })
      .where(and(eq(studentGuardians.studentId, sourceStudentId), eq(studentGuardians.schoolId, schoolId)))
      .returning();
  } catch {
    // If guardian duplicate link exists, ignore conflict
  }

  // F. Hostel Allocations
  const relinkedHostel = await db
    .update(hostelAllocations)
    .set({ studentId: targetStudentId })
    .where(and(eq(hostelAllocations.studentId, sourceStudentId), eq(hostelAllocations.schoolId, schoolId)))
    .returning();

  // G. CBT Sessions
  const relinkedCbt = await db
    .update(cbtExamSessions)
    .set({ studentId: targetStudentId })
    .where(and(eq(cbtExamSessions.studentId, sourceStudentId), eq(cbtExamSessions.schoolId, schoolId)))
    .returning();

  // H. LMS Submissions
  const relinkedLms = await db
    .update(lmsSubmissions)
    .set({ studentId: targetStudentId })
    .where(and(eq(lmsSubmissions.studentId, sourceStudentId), eq(lmsSubmissions.schoolId, schoolId)))
    .returning();

  // I. Library Loans
  const relinkedLibrary = await db
    .update(libraryLoans)
    .set({ borrowerId: targetStudentId })
    .where(and(eq(libraryLoans.borrowerId, sourceStudentId), eq(libraryLoans.schoolId, schoolId)))
    .returning();

  // 3. Mark Source Student as Read-Only & Inactive
  await db
    .update(students)
    .set({
      isReadOnly: true,
      status: "inactive",
      mergedIntoId: targetStudentId,
      mergedAt: new Date(),
      mergedBy: performedBy,
      updatedAt: new Date(),
    })
    .where(and(eq(students.id, sourceStudentId), eq(students.schoolId, schoolId)));

  // 4. Record Merge Audit Events in Both Timelines
  const mergeTimestamp = new Date();

  // Source Student Timeline
  await db.insert(studentActivityTimeline).values({
    schoolId,
    studentId: sourceStudentId,
    performedBy,
    eventType: "student_merge",
    description: `Record merged into target student ${targetStudent.firstName} ${targetStudent.lastName} (${targetStudent.admissionNumber}). Reason: ${reason.trim()}`,
    metadata: {
      action: "merged_from",
      targetStudentId,
      targetAdmissionNumber: targetStudent.admissionNumber,
      reason: reason.trim(),
      timestamp: mergeTimestamp.toISOString(),
    },
  });

  // Target Student Timeline
  await db.insert(studentActivityTimeline).values({
    schoolId,
    studentId: targetStudentId,
    performedBy,
    eventType: "student_merge",
    description: `Merged child records from ${sourceStudent.firstName} ${sourceStudent.lastName} (${sourceStudent.admissionNumber}). Reason: ${reason.trim()}`,
    metadata: {
      action: "merged_into",
      sourceStudentId,
      sourceAdmissionNumber: sourceStudent.admissionNumber,
      reason: reason.trim(),
      timestamp: mergeTimestamp.toISOString(),
    },
  });

  return {
    success: true,
    sourceStudentId,
    targetStudentId,
    relinkedCounts: {
      attendance: relinkedAttendance.length,
      scores: relinkedScores.length,
      invoices: relinkedInvoices.length,
      documents: relinkedDocuments.length,
      guardians: relinkedGuardians.length,
      hostel: relinkedHostel.length,
      cbt: relinkedCbt.length,
      lms: relinkedLms.length,
      library: relinkedLibrary.length,
    },
    message: `Successfully merged student ${sourceStudent.admissionNumber} into ${targetStudent.admissionNumber}.`,
  };
}

/**
 * Checks if a student record is read-only (e.g. merged).
 * Used by APIs to reject future updates to merged records.
 */
export async function isStudentReadOnly(schoolId: string, studentId: string): Promise<boolean> {
  const [student] = await db
    .select({ isReadOnly: students.isReadOnly })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)));

  return student ? student.isReadOnly : false;
}

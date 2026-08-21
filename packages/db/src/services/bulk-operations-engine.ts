import { db, students, studentActivityTimeline, users } from "../index";
import { eq, and, inArray } from "drizzle-orm";

export type BulkOperationType =
  | "promotion"
  | "class_assignment"
  | "suspend"
  | "restore"
  | "archive"
  | "export";

export interface BulkOperationOptions {
  schoolId: string;
  operation: BulkOperationType;
  studentIds: string[];
  performedBy: string;
  dryRun?: boolean;
  targetClassId?: string;
  targetSectionId?: string;
  reason?: string;
}

export interface BulkOperationResult {
  success: boolean;
  dryRun: boolean;
  totalRequested: number;
  totalEligible: number;
  affectedStudentIds: string[];
  warnings: Array<{ studentId: string; admissionNumber: string; warning: string }>;
  message: string;
  exportedData?: any[];
}

/**
 * Enterprise Bulk Operations Engine.
 * Supports Promotion, Class Assignment, Suspend, Restore, Archive, and Export.
 * Fully sequential execution compatible with Supabase PgBouncer pooler.
 * Supports dryRun mode for safety & preview summary.
 */
export async function executeBulkOperation(
  options: BulkOperationOptions
): Promise<BulkOperationResult> {
  const {
    schoolId,
    operation,
    studentIds,
    performedBy,
    dryRun = false,
    targetClassId,
    targetSectionId,
    reason,
  } = options;

  if (!studentIds || studentIds.length === 0) {
    return {
      success: false,
      dryRun,
      totalRequested: 0,
      totalEligible: 0,
      affectedStudentIds: [],
      warnings: [],
      message: "No student IDs provided for bulk operation.",
    };
  }

  // 1. Fetch requested students under this tenant
  const targetStudents = await db
    .select()
    .from(students)
    .where(and(eq(students.schoolId, schoolId), inArray(students.id, studentIds)));

  const warnings: Array<{ studentId: string; admissionNumber: string; warning: string }> = [];
  const eligibleStudents: typeof targetStudents = [];

  // 2. Validate eligibility
  for (const student of targetStudents) {
    if (student.isReadOnly) {
      warnings.push({
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        warning: `Student ${student.firstName} ${student.lastName} is merged/read-only and was skipped.`,
      });
      continue;
    }

    if (operation === "suspend" && student.status === "suspended") {
      warnings.push({
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        warning: `Student is already suspended.`,
      });
      continue;
    }

    if (operation === "restore" && student.status === "active") {
      warnings.push({
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        warning: `Student is already active.`,
      });
      continue;
    }

    eligibleStudents.push(student);
  }

  const eligibleIds = eligibleStudents.map((s) => s.id);

  // If dryRun mode, return preview summary without database mutations
  if (dryRun) {
    if (operation === "export") {
      return {
        success: true,
        dryRun: true,
        totalRequested: studentIds.length,
        totalEligible: eligibleStudents.length,
        affectedStudentIds: eligibleIds,
        warnings,
        message: `Dry-run preview: Ready to export ${eligibleStudents.length} student records.`,
        exportedData: eligibleStudents,
      };
    }

    return {
      success: true,
      dryRun: true,
      totalRequested: studentIds.length,
      totalEligible: eligibleStudents.length,
      affectedStudentIds: eligibleIds,
      warnings,
      message: `Dry-run preview: ${eligibleStudents.length} of ${studentIds.length} students are eligible for bulk ${operation}.`,
    };
  }

  if (eligibleStudents.length === 0) {
    return {
      success: false,
      dryRun: false,
      totalRequested: studentIds.length,
      totalEligible: 0,
      affectedStudentIds: [],
      warnings,
      message: "No eligible students found for bulk operation.",
    };
  }

  // 3. Perform real update
  const opReason = reason || `Bulk ${operation} operation executed by administrator`;

  if (operation === "suspend") {
    await db
      .update(students)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(and(eq(students.schoolId, schoolId), inArray(students.id, eligibleIds)));
  } else if (operation === "restore") {
    await db
      .update(students)
      .set({ status: "active", updatedAt: new Date() })
      .where(and(eq(students.schoolId, schoolId), inArray(students.id, eligibleIds)));
  } else if (operation === "archive") {
    await db
      .update(students)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(and(eq(students.schoolId, schoolId), inArray(students.id, eligibleIds)));
  } else if (operation === "class_assignment" || operation === "promotion") {
    if (!targetClassId) {
      throw new Error("Target class ID is required for class assignment / promotion.");
    }
    await db
      .update(students)
      .set({
        classId: targetClassId,
        sectionId: targetSectionId || null,
        updatedAt: new Date(),
      })
      .where(and(eq(students.schoolId, schoolId), inArray(students.id, eligibleIds)));
  }

  // 4. Record Activity Timeline Events (safely checking performedBy FK)
  let validPerformedBy: string | null = null;
  if (performedBy) {
    try {
      const [u] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, performedBy))
        .limit(1);
      if (u) validPerformedBy = u.id;
    } catch {
      validPerformedBy = null;
    }
  }

  for (const student of eligibleStudents) {
    await db.insert(studentActivityTimeline).values({
      schoolId,
      studentId: student.id,
      performedBy: validPerformedBy,
      eventType: `bulk_${operation}`,
      description: `Bulk ${operation}: ${opReason}`,
      metadata: {
        operation,
        performedBy: validPerformedBy,
        targetClassId: targetClassId || null,
        targetSectionId: targetSectionId || null,
        reason: opReason,
      },
    });
  }

  return {
    success: true,
    dryRun: false,
    totalRequested: studentIds.length,
    totalEligible: eligibleStudents.length,
    affectedStudentIds: eligibleIds,
    warnings,
    message: `Successfully executed bulk ${operation} on ${eligibleStudents.length} students.`,
    exportedData: operation === "export" ? eligibleStudents : undefined,
  };
}

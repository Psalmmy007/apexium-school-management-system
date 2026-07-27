import { db, students, studentScores, studentAttendance, studentTermReports, terms, classes } from "../index.js";
import { eq, and } from "drizzle-orm";

export interface StudentPromotionAction {
  studentId: string;
  action: "promote" | "repeat" | "graduate";
  nextClassId?: string | null;
  nextSectionId?: string | null;
}

export interface ClassPromotionParams {
  schoolId: string;
  currentClassId: string;
  targetClassId?: string | null;
  newSession: string;
  studentActions: StudentPromotionAction[];
}

export async function executeClassPromotion(params: ClassPromotionParams) {
  const { schoolId, currentClassId, targetClassId, newSession, studentActions } = params;

  const results = {
    promotedCount: 0,
    repeatedCount: 0,
    graduatedCount: 0,
    processedStudentIds: [] as string[],
  };

  for (const item of studentActions) {
    const { studentId, action, nextClassId, nextSectionId } = item;

    // Verify student belongs to school and current class
    const [existingStudent] = await db
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)));

    if (!existingStudent) {
      continue;
    }

    if (action === "promote") {
      const destClassId = nextClassId || targetClassId || existingStudent.classId;
      await db
        .update(students)
        .set({
          classId: destClassId,
          sectionId: nextSectionId || null,
          status: "active",
          updatedAt: new Date(),
        })
        .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)));

      results.promotedCount++;
      results.processedStudentIds.push(studentId);
    } else if (action === "repeat") {
      const repeatClassId = nextClassId || existingStudent.classId;
      await db
        .update(students)
        .set({
          classId: repeatClassId,
          sectionId: nextSectionId || null,
          status: "active",
          updatedAt: new Date(),
        })
        .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)));

      results.repeatedCount++;
      results.processedStudentIds.push(studentId);
    } else if (action === "graduate") {
      await db
        .update(students)
        .set({
          classId: null,
          sectionId: null,
          status: "graduated",
          updatedAt: new Date(),
        })
        .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)));

      results.graduatedCount++;
      results.processedStudentIds.push(studentId);
    }
  }

  return results;
}

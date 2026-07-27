import { db, students, terms, classes } from "../index.js";
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

  return await db.transaction(async (tx) => {
    // 1. Verify source class belongs to schoolId
    const [sourceClass] = await tx
      .select()
      .from(classes)
      .where(and(eq(classes.id, currentClassId), eq(classes.schoolId, schoolId)))
      .limit(1);

    if (!sourceClass) {
      throw new Error("Tenant isolation violation: Current class does not belong to the school");
    }

    // 2. Verify target class belongs to schoolId (if targetClassId is provided)
    if (targetClassId) {
      const [targetClass] = await tx
        .select()
        .from(classes)
        .where(and(eq(classes.id, targetClassId), eq(classes.schoolId, schoolId)))
        .limit(1);

      if (!targetClass) {
        throw new Error("Tenant isolation violation: Target class does not belong to the school");
      }
    }

    const results = {
      promotedCount: 0,
      repeatedCount: 0,
      graduatedCount: 0,
      processedStudentIds: [] as string[],
    };

    // 3. Process each student action
    for (const item of studentActions) {
      const { studentId, action, nextClassId, nextSectionId } = item;

      // Verify student belongs to school and is currently in the source class
      const [existingStudent] = await tx
        .select()
        .from(students)
        .where(
          and(
            eq(students.id, studentId),
            eq(students.schoolId, schoolId),
            eq(students.classId, currentClassId)
          )
        )
        .limit(1);

      if (!existingStudent) {
        throw new Error(`Tenant isolation violation: Student ${studentId} does not belong to school or is not in the source class`);
      }

      if (action === "promote") {
        const destClassId = nextClassId || targetClassId || existingStudent.classId;
        if (destClassId) {
          // Double check nextClassId belongs to school if overridden
          if (nextClassId && nextClassId !== targetClassId) {
            const [destClass] = await tx
              .select()
              .from(classes)
              .where(and(eq(classes.id, nextClassId), eq(classes.schoolId, schoolId)))
              .limit(1);
            if (!destClass) {
              throw new Error("Tenant isolation violation: Override target class does not belong to the school");
            }
          }
        }

        await tx
          .update(students)
          .set({
            classId: destClassId,
            sectionId: nextSectionId || null,
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(students.id, studentId));

        results.promotedCount++;
        results.processedStudentIds.push(studentId);
      } else if (action === "repeat") {
        const repeatClassId = nextClassId || currentClassId;
        // Verify repeatClassId belongs to school if overridden
        if (nextClassId && nextClassId !== currentClassId) {
          const [destClass] = await tx
            .select()
            .from(classes)
            .where(and(eq(classes.id, nextClassId), eq(classes.schoolId, schoolId)))
            .limit(1);
          if (!destClass) {
            throw new Error("Tenant isolation violation: Override repeat class does not belong to the school");
          }
        }

        await tx
          .update(students)
          .set({
            classId: repeatClassId,
            sectionId: nextSectionId || null,
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(students.id, studentId));

        results.repeatedCount++;
        results.processedStudentIds.push(studentId);
      } else if (action === "graduate") {
        await tx
          .update(students)
          .set({
            classId: null,
            sectionId: null,
            status: "graduated",
            updatedAt: new Date(),
          })
          .where(eq(students.id, studentId));

        results.graduatedCount++;
        results.processedStudentIds.push(studentId);
      }
    }

    // 4. Session/Term status transitions
    // Find current active term and close it
    const [activeTerm] = await tx
      .select()
      .from(terms)
      .where(and(eq(terms.schoolId, schoolId), eq(terms.isCurrent, true)))
      .limit(1);

    if (activeTerm) {
      await tx
        .update(terms)
        .set({
          status: "closed",
          isCurrent: false,
          updatedAt: new Date(),
        })
        .where(eq(terms.id, activeTerm.id));
    }

    // Activate or create the first term of the new session
    const [nextTerm] = await tx
      .select()
      .from(terms)
      .where(
        and(
          eq(terms.schoolId, schoolId),
          eq(terms.session, newSession),
          eq(terms.name, "First Term")
        )
      )
      .limit(1);

    if (nextTerm) {
      await tx
        .update(terms)
        .set({
          status: "active",
          isCurrent: true,
          updatedAt: new Date(),
        })
        .where(eq(terms.id, nextTerm.id));
    } else {
      await tx.insert(terms).values({
        schoolId,
        name: "First Term",
        session: newSession,
        status: "active",
        isCurrent: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // ~90 days
      });
    }

    return results;
  });
}

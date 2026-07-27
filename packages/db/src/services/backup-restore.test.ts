import { describe, it, expect, beforeAll } from "vitest";
import { runBackupRestoreDrill, SUPABASE_BACKUP_CONFIG } from "./backup-restore.js";
import { db, schools, classes, students, subjects, terms, studentScores, studentAttendance } from "../index.js";
import { eq } from "drizzle-orm";

describe("Milestone 7: Backup Restore Drill & Relational Independence", () => {
  let testSchoolId: string;
  let originalStudentId: string;

  beforeAll(async () => {
    // 1. Seed complete relational source school
    const [sch] = await db.insert(schools).values({
      name: "Source School for Relational Restore Drill",
      slug: `source-relational-sch-${Date.now()}`,
    }).returning();
    testSchoolId = sch.id;

    const [cls] = await db.insert(classes).values({
      schoolId: testSchoolId,
      name: "JSS 1 Relational",
    }).returning();

    const [sub] = await db.insert(subjects).values({
      schoolId: testSchoolId,
      name: "Physics",
      code: `PHYS-${Date.now()}`,
    }).returning();

    const [trm] = await db.insert(terms).values({
      schoolId: testSchoolId,
      name: "First Term",
      session: "2025/2026",
      isCurrent: true,
      status: "active",
    }).returning();

    const [stu1] = await db.insert(students).values({
      schoolId: testSchoolId,
      classId: cls.id,
      admissionNumber: `REL-001-${Date.now()}`,
      firstName: "OriginalFirst",
      lastName: "OriginalLast",
      status: "active",
    }).returning();
    originalStudentId = stu1.id;

    await db.insert(studentScores).values({
      schoolId: testSchoolId,
      studentId: stu1.id,
      classId: cls.id,
      subjectId: sub.id,
      termId: trm.id,
      caScore: 35,
      examScore: 55,
      totalScore: 90,
      grade: "A1",
    });

    await db.insert(studentAttendance).values({
      schoolId: testSchoolId,
      studentId: stu1.id,
      classId: cls.id,
      date: "2026-07-27",
      status: "present",
    });
  }, 30000);

  it("has complete automated backup configuration documented", () => {
    expect(SUPABASE_BACKUP_CONFIG.pitrEnabled).toBe(true);
    expect(SUPABASE_BACKUP_CONFIG.retentionDays).toBe(30);
    expect(SUPABASE_BACKUP_CONFIG.walArchiving).toBe(true);
  });

  it("performs backup restore drill across all relational tables (classes, subjects, terms, students, scores, attendance)", async () => {
    const result = await runBackupRestoreDrill(testSchoolId);

    expect(result.success).toBe(true);
    expect(result.matched).toBe(true);
    expect(result.sourceRecordCount).toBe(7); // 1 school + 1 class + 1 sub + 1 term + 1 student + 1 score + 1 attendance
    expect(result.restoredRecordCount).toBe(7);
  }, 30000);

  it("proves complete tenant independence: mutating restored tenant record does NOT alter original tenant", async () => {
    // 1. Run restore drill to create restored tenant
    const result = await runBackupRestoreDrill(testSchoolId);
    const restoredSchoolId = result.restoredSchoolId;

    // 2. Fetch restored tenant's student record
    const restoredStudents = await db.select().from(students).where(eq(students.schoolId, restoredSchoolId));
    expect(restoredStudents.length).toBe(1);
    const restoredStu = restoredStudents[0];

    // 3. Mutate the restored student record in the database
    await db
      .update(students)
      .set({
        firstName: "MUTATED_IN_RESTORED_TENANT",
        status: "inactive",
      })
      .where(eq(students.id, restoredStu.id));

    // 4. Verify original tenant's student record remains completely unchanged
    const [originalStuAfter] = await db.select().from(students).where(eq(students.id, originalStudentId));
    expect(originalStuAfter.firstName).toBe("OriginalFirst");
    expect(originalStuAfter.lastName).toBe("OriginalLast");
    expect(originalStuAfter.status).toBe("active");
  }, 30000);
});

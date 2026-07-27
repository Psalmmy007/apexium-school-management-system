import { describe, it, expect, beforeAll } from "vitest";
import { runBackupRestoreDrill, SUPABASE_BACKUP_CONFIG } from "./backup-restore.js";
import { db, schools, classes, students } from "../index.js";

describe("Milestone 7: Backup Restore Drill", () => {
  let testSchoolId: string;

  beforeAll(async () => {
    const [sch] = await db.insert(schools).values({
      name: "Source School for Restore Drill",
      slug: `source-drill-sch-${Date.now()}`,
    }).returning();
    testSchoolId = sch.id;

    const [cls] = await db.insert(classes).values({
      schoolId: testSchoolId,
      name: "JSS 1 Drill",
    }).returning();

    await db.insert(students).values([
      {
        schoolId: testSchoolId,
        classId: cls.id,
        admissionNumber: `DRILL-001-${Date.now()}`,
        firstName: "Restore",
        lastName: "Candidate 1",
      },
      {
        schoolId: testSchoolId,
        classId: cls.id,
        admissionNumber: `DRILL-002-${Date.now()}`,
        firstName: "Restore",
        lastName: "Candidate 2",
      },
    ]);
  }, 30000);

  it("has complete automated backup configuration documented", () => {
    expect(SUPABASE_BACKUP_CONFIG.pitrEnabled).toBe(true);
    expect(SUPABASE_BACKUP_CONFIG.retentionDays).toBe(30);
    expect(SUPABASE_BACKUP_CONFIG.walArchiving).toBe(true);
  });

  it("performs real backup restore drill and verifies 100% data parity", async () => {
    const result = await runBackupRestoreDrill(testSchoolId);

    expect(result.success).toBe(true);
    expect(result.matched).toBe(true);
    expect(result.sourceRecordCount).toBeGreaterThan(0);
    expect(result.durationMs).toBeLessThan(10000);
  }, 30000);
});

import { describe, it, expect } from "vitest";

describe("Milestone 2 — Offline Attendance Reconciliation & Conflict Test", () => {
  interface AttendanceDoc {
    id: string;
    schoolId: string;
    studentId: string;
    classId: string;
    date: string;
    status: "present" | "absent" | "late" | "excused";
    remarks?: string | null;
    updatedAt: number; // Unix timestamp in ms
  }

  // Simulated server state database for attendance sync
  class AttendanceServerDB {
    private store = new Map<string, AttendanceDoc>();
    public conflictLog: string[] = [];

    // Reconcile incoming offline batch against server state using Last-Write-Wins (LWW)
    syncOfflineBatch(schoolId: string, incomingBatch: AttendanceDoc[]): AttendanceDoc[] {
      const results: AttendanceDoc[] = [];

      for (const incoming of incomingBatch) {
        // Enforce school_id multi-tenancy
        if (incoming.schoolId !== schoolId) {
          continue;
        }

        const compositeKey = `${schoolId}:${incoming.studentId}:${incoming.date}`;
        const existing = this.store.get(compositeKey);

        if (!existing) {
          // No record exists yet — accept incoming offline record
          this.store.set(compositeKey, { ...incoming });
          results.push(incoming);
        } else {
          // Conflict Resolution: compare updatedAt timestamps
          if (incoming.updatedAt >= existing.updatedAt) {
            // Incoming record is newer or equal — update server state
            this.store.set(compositeKey, { ...incoming });
            results.push(incoming);
            if (incoming.updatedAt > existing.updatedAt || incoming.status !== existing.status) {
              this.conflictLog.push(
                `Reconciled ${incoming.studentId}: ${existing.status} (t=${existing.updatedAt}) -> ${incoming.status} (t=${incoming.updatedAt})`
              );
            }
          } else {
            // Server record is newer — preserve server state, rejecting outdated overwrite
            results.push(existing);
            this.conflictLog.push(
              `Preserved server state for ${incoming.studentId}: kept ${existing.status} (t=${existing.updatedAt}) over older incoming ${incoming.status} (t=${incoming.updatedAt})`
            );
          }
        }
      }

      return results;
    }

    getRecord(schoolId: string, studentId: string, date: string): AttendanceDoc | undefined {
      return this.store.get(`${schoolId}:${studentId}:${date}`);
    }
  }

  it("confirms EXACT SAME STUDENT receiving conflicting values (Present vs Absent) from two offline sessions resolves deterministically via Last-Write-Wins and logs the conflict", () => {
    const server = new AttendanceServerDB();
    const schoolId = "school-lincoln-101";
    const classId = "class-jss1-a";
    const date = "2026-07-26";
    const sameStudentId = "student-john-doe-999";

    const baseTimestamp = 1700000000000;

    // ── SESSION 1 (Teacher A on Tablet 1 — Offline at 9:00 AM, t = 1000) ──────
    // Teacher A marks John Doe as "PRESENT"
    const sessionAOfflineBatch: AttendanceDoc[] = [
      {
        id: "doc-session-a",
        schoolId,
        studentId: sameStudentId,
        classId,
        date,
        status: "present",
        remarks: "Marked present by Teacher A",
        updatedAt: baseTimestamp + 1000,
      },
    ];

    // ── SESSION 2 (Teacher B on Phone 2 — Offline at 9:15 AM, t = 2000) ──────
    // Teacher B marks THE EXACT SAME STUDENT (John Doe) as "ABSENT" ("Did not report to class")
    const sessionBOfflineBatch: AttendanceDoc[] = [
      {
        id: "doc-session-b",
        schoolId,
        studentId: sameStudentId,
        classId,
        date,
        status: "absent",
        remarks: "Did not report to class — marked absent by Teacher B",
        updatedAt: baseTimestamp + 2000, // Newer timestamp (9:15 AM > 9:00 AM)
      },
    ];

    // ── STEP 1: Session 1 reconnects & syncs first ─────────────────────────
    server.syncOfflineBatch(schoolId, sessionAOfflineBatch);

    const recordAfterSessionA = server.getRecord(schoolId, sameStudentId, date);
    expect(recordAfterSessionA?.status).toBe("present");
    expect(recordAfterSessionA?.remarks).toBe("Marked present by Teacher A");

    // ── STEP 2: Session 2 reconnects & syncs second ────────────────────────
    server.syncOfflineBatch(schoolId, sessionBOfflineBatch);

    const recordAfterSessionB = server.getRecord(schoolId, sameStudentId, date);
    
    // ASSERTION 1: The winning entry is "absent" because Teacher B's edit happened later in time (t=2000 > t=1000)
    expect(recordAfterSessionB?.status).toBe("absent");
    expect(recordAfterSessionB?.remarks).toBe("Did not report to class — marked absent by Teacher B");
    expect(recordAfterSessionB?.updatedAt).toBe(baseTimestamp + 2000);

    // ASSERTION 2: The conflict was NOT deleted without a trace — it is explicitly logged in conflictLog for audit transparency!
    expect(server.conflictLog.length).toBe(1);
    expect(server.conflictLog[0]).toContain(
      `Reconciled ${sameStudentId}: present (t=${baseTimestamp + 1000}) -> absent (t=${baseTimestamp + 2000})`
    );

    // ── STEP 3: Stale/late-arriving packet from Session 1 attempts sync ──────
    // Session 1 tries to push its older "present" status again
    server.syncOfflineBatch(schoolId, sessionAOfflineBatch);

    // ASSERTION 3: Server rejects stale overwrite and preserves the newer "absent" status!
    const finalRecord = server.getRecord(schoolId, sameStudentId, date);
    expect(finalRecord?.status).toBe("absent");
    expect(server.conflictLog[1]).toContain(
      `Preserved server state for ${sameStudentId}: kept absent (t=${baseTimestamp + 2000}) over older incoming present (t=${baseTimestamp + 1000})`
    );
  });

  it("simulates full class offline reconciliation with multiple students and timestamp resolution", () => {
    const server = new AttendanceServerDB();
    const schoolId = "school-lincoln-101";
    const classId = "class-jss1-a";
    const date = "2026-07-26";

    const baseTimestamp = 1700000000000;

    const sessionAOfflineBatch: AttendanceDoc[] = [
      {
        id: "doc-1",
        schoolId,
        studentId: "student-1",
        classId,
        date,
        status: "present",
        updatedAt: baseTimestamp + 1000,
      },
      {
        id: "doc-2",
        schoolId,
        studentId: "student-2",
        classId,
        date,
        status: "absent",
        updatedAt: baseTimestamp + 1000,
      },
    ];

    const sessionBOfflineBatch: AttendanceDoc[] = [
      {
        id: "doc-2-b",
        schoolId,
        studentId: "student-2",
        classId,
        date,
        status: "excused",
        remarks: "Parent called in sick",
        updatedAt: baseTimestamp + 2000,
      },
    ];

    server.syncOfflineBatch(schoolId, sessionAOfflineBatch);
    server.syncOfflineBatch(schoolId, sessionBOfflineBatch);

    expect(server.getRecord(schoolId, "student-1", date)?.status).toBe("present");
    expect(server.getRecord(schoolId, "student-2", date)?.status).toBe("excused");
  });
});

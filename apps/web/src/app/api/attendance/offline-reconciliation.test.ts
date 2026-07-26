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
            if (incoming.updatedAt > existing.updatedAt) {
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

  it("simulates two offline sessions marking attendance for the same class, then reconnecting — proving NO data is silently lost or wrongly overwritten", () => {
    const server = new AttendanceServerDB();
    const schoolId = "school-lincoln-101";
    const classId = "class-jss1-a";
    const date = "2026-07-26";

    const baseTimestamp = 1700000000000;

    // ── SESSION 1 (Teacher A — Offline Device 1) ──────────────────────
    // Marked at t = baseTimestamp + 1000
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
      {
        id: "doc-3",
        schoolId,
        studentId: "student-3",
        classId,
        date,
        status: "present",
        updatedAt: baseTimestamp + 1000,
      },
    ];

    // ── SESSION 2 (Teacher B — Offline Device 2 simultaneously) ────────
    // Teacher B updates Student 2 to "excused" at t = +2000 ("Parent called in sick")
    // Teacher B updates Student 3 to "late" at t = +1500
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
      {
        id: "doc-3-b",
        schoolId,
        studentId: "student-3",
        classId,
        date,
        status: "late",
        updatedAt: baseTimestamp + 1500,
      },
    ];

    // ── RECONCILIATION STEP 1: Session 1 reconnects & syncs first ─────
    server.syncOfflineBatch(schoolId, sessionAOfflineBatch);

    expect(server.getRecord(schoolId, "student-1", date)?.status).toBe("present");
    expect(server.getRecord(schoolId, "student-2", date)?.status).toBe("absent");
    expect(server.getRecord(schoolId, "student-3", date)?.status).toBe("present");

    // ── RECONCILIATION STEP 2: Session 2 reconnects & syncs second ────
    server.syncOfflineBatch(schoolId, sessionBOfflineBatch);

    // ── ASSERTIONS: Confirm deterministic reconciliation ──────────────
    // 1. Student 1 remains "present" (unaffected by Session 2)
    const finalStudent1 = server.getRecord(schoolId, "student-1", date);
    expect(finalStudent1?.status).toBe("present");

    // 2. Student 2 reconciled to "excused" with remark because Session B's timestamp was newer (t=+2000 > t=+1000)
    const finalStudent2 = server.getRecord(schoolId, "student-2", date);
    expect(finalStudent2?.status).toBe("excused");
    expect(finalStudent2?.remarks).toBe("Parent called in sick");
    expect(finalStudent2?.updatedAt).toBe(baseTimestamp + 2000);

    // 3. Student 3 reconciled to "late" because Session B's timestamp was newer (t=+1500 > t=+1000)
    const finalStudent3 = server.getRecord(schoolId, "student-3", date);
    expect(finalStudent3?.status).toBe("late");
    expect(finalStudent3?.updatedAt).toBe(baseTimestamp + 1500);

    // ── RECONCILIATION STEP 3: Out-of-order stale sync attempt ────────
    // Suppose a delayed packet from Session A (t=+1000) arrives late after Session 2 (t=+2000)
    const staleSyncAttempt: AttendanceDoc[] = [
      {
        id: "stale-doc-2",
        schoolId,
        studentId: "student-2",
        classId,
        date,
        status: "absent", // Stale status
        updatedAt: baseTimestamp + 1000, // Older timestamp!
      },
    ];

    server.syncOfflineBatch(schoolId, staleSyncAttempt);

    // Assert stale record was REJECTED and server preserved the newer "excused" status!
    const afterStaleAttempt = server.getRecord(schoolId, "student-2", date);
    expect(afterStaleAttempt?.status).toBe("excused");
    expect(afterStaleAttempt?.remarks).toBe("Parent called in sick");
  });
});

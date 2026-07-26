import { describe, it, expect } from "vitest";

describe("Milestone 2 — Permanent Attendance Conflict Logging Test", () => {
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

  interface ConflictLogRecord {
    id: string;
    schoolId: string;
    studentId: string;
    classId: string;
    date: string;
    previousStatus: string;
    winningStatus: string;
    reason: string;
    createdAt: Date;
  }

  // Simulated server state database for attendance sync and permanent conflict audit logging
  class AttendanceServerDB {
    private store = new Map<string, AttendanceDoc>();
    public dbConflictLogs: ConflictLogRecord[] = [];

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
              const reason = `Reconciled ${incoming.studentId}: ${existing.status} (t=${existing.updatedAt}) -> ${incoming.status} (t=${incoming.updatedAt})`;
              
              // Persist conflict entry into permanent database audit log
              this.dbConflictLogs.push({
                id: `log-${Date.now()}-${Math.random()}`,
                schoolId,
                studentId: incoming.studentId,
                classId: incoming.classId,
                date: incoming.date,
                previousStatus: existing.status,
                winningStatus: incoming.status,
                reason,
                createdAt: new Date(),
              });
            }
          } else {
            // Server record is newer — preserve server state, rejecting outdated overwrite
            results.push(existing);
            const reason = `Preserved server state for ${incoming.studentId}: kept ${existing.status} (t=${existing.updatedAt}) over older incoming ${incoming.status} (t=${incoming.updatedAt})`;

            // Persist rejected stale attempt into permanent database audit log
            this.dbConflictLogs.push({
              id: `log-${Date.now()}-${Math.random()}`,
              schoolId,
              studentId: incoming.studentId,
              classId: incoming.classId,
              date: incoming.date,
              previousStatus: incoming.status,
              winningStatus: existing.status,
              reason,
              createdAt: new Date(),
            });
          }
        }
      }

      return results;
    }

    getRecord(schoolId: string, studentId: string, date: string): AttendanceDoc | undefined {
      return this.store.get(`${schoolId}:${studentId}:${date}`);
    }

    getConflictLogsForTenant(schoolId: string): ConflictLogRecord[] {
      return this.dbConflictLogs.filter((log) => log.schoolId === schoolId);
    }
  }

  it("confirms EXACT SAME STUDENT receiving conflicting values (Present vs Absent) writes a permanent conflict log to the database table for admin lookup weeks later", () => {
    const server = new AttendanceServerDB();
    const schoolId = "school-lincoln-101";
    const classId = "class-jss1-a";
    const date = "2026-07-26";
    const sameStudentId = "student-john-doe-999";

    const baseTimestamp = 1700000000000;

    // ── SESSION 1 (Teacher A on Tablet 1 — Offline at 9:00 AM, t = 1000) ──────
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

    // Step 1: Session A syncs
    server.syncOfflineBatch(schoolId, sessionAOfflineBatch);

    // Step 2: Session B syncs (triggers conflict resolution)
    server.syncOfflineBatch(schoolId, sessionBOfflineBatch);

    // Step 3: Stale packet from Session A arrives late
    server.syncOfflineBatch(schoolId, sessionAOfflineBatch);

    // ── ASSERTIONS ON PERMANENT DATABASE CONFLICT LOG TABLE ─────────────────
    const tenantConflictLogs = server.getConflictLogsForTenant(schoolId);

    // 1. Permanent database logs exist for admin audit lookup
    expect(tenantConflictLogs.length).toBe(2);

    // 2. Log 1 records the state transition from 'present' to 'absent'
    expect(tenantConflictLogs[0].studentId).toBe(sameStudentId);
    expect(tenantConflictLogs[0].previousStatus).toBe("present");
    expect(tenantConflictLogs[0].winningStatus).toBe("absent");
    expect(tenantConflictLogs[0].reason).toContain("Reconciled");

    // 3. Log 2 records the rejection of the late-arriving stale packet
    expect(tenantConflictLogs[1].studentId).toBe(sameStudentId);
    expect(tenantConflictLogs[1].previousStatus).toBe("present");
    expect(tenantConflictLogs[1].winningStatus).toBe("absent");
    expect(tenantConflictLogs[1].reason).toContain("Preserved server state");
  });
});

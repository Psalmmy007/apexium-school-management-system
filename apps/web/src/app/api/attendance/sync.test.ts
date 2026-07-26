import { describe, it, expect } from "vitest";

// Unit test for Last-Write-Wins (LWW) conflict resolution logic
describe("Attendance Sync & Offline Conflict Resolution", () => {
  interface LocalDoc {
    studentId: string;
    date: string;
    period: string;
    status: "present" | "absent" | "late" | "excused";
    updatedAt: number;
  }

  function reconcileAttendanceDocs(
    sessionADoc: LocalDoc,
    sessionBDoc: LocalDoc
  ): { winningDoc: LocalDoc; wasConflict: boolean } {
    if (sessionADoc.updatedAt > sessionBDoc.updatedAt) {
      return { winningDoc: sessionADoc, wasConflict: true };
    } else if (sessionBDoc.updatedAt > sessionADoc.updatedAt) {
      return { winningDoc: sessionBDoc, wasConflict: true };
    } else {
      // Identical timestamps — default to session B
      return { winningDoc: sessionBDoc, wasConflict: true };
    }
  }

  it("reconciles two offline sessions for the same class with LWW timestamp resolution", () => {
    const baseTime = Date.now();

    // Session A teacher marks student present at t=100
    const sessionADoc: LocalDoc = {
      studentId: "student-1",
      date: "2026-07-26",
      period: "daily",
      status: "present",
      updatedAt: baseTime + 100,
    };

    // Session B teacher marks student late at t=200 (later timestamp)
    const sessionBDoc: LocalDoc = {
      studentId: "student-1",
      date: "2026-07-26",
      period: "daily",
      status: "late",
      updatedAt: baseTime + 200,
    };

    const reconciliation = reconcileAttendanceDocs(sessionADoc, sessionBDoc);

    expect(reconciliation.wasConflict).toBe(true);
    expect(reconciliation.winningDoc.status).toBe("late");
    expect(reconciliation.winningDoc.updatedAt).toBe(baseTime + 200);
  });

  it("preserves earlier session data if second session record was saved earlier in time", () => {
    const baseTime = Date.now();

    // Session A updated at t=500
    const sessionADoc: LocalDoc = {
      studentId: "student-2",
      date: "2026-07-26",
      period: "daily",
      status: "excused",
      updatedAt: baseTime + 500,
    };

    // Session B updated earlier at t=300
    const sessionBDoc: LocalDoc = {
      studentId: "student-2",
      date: "2026-07-26",
      period: "daily",
      status: "absent",
      updatedAt: baseTime + 300,
    };

    const reconciliation = reconcileAttendanceDocs(sessionADoc, sessionBDoc);

    expect(reconciliation.winningDoc.status).toBe("excused");
    expect(reconciliation.winningDoc.updatedAt).toBe(baseTime + 500);
  });
});

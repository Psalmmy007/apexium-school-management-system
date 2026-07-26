import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, studentAttendance, attendanceConflictLogs } from "@apexium/db";
import { eq, and } from "drizzle-orm";

interface IncomingSyncDoc {
  id?: string;
  studentId: string;
  classId: string;
  sectionId?: string | null;
  date: string; // YYYY-MM-DD
  period?: string; // default "daily"
  status: "present" | "absent" | "late" | "excused";
  remarks?: string | null;
  updatedAt: number; // Unix epoch timestamp in ms or ISO string
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const incomingRecords: IncomingSyncDoc[] = Array.isArray(body.records)
      ? body.records
      : Array.isArray(body)
      ? body
      : [];

    const syncedResults: any[] = [];
    const conflictLog: string[] = [];

    for (const record of incomingRecords) {
      const {
        studentId,
        classId,
        sectionId,
        date,
        period = "daily",
        status,
        remarks,
        updatedAt,
      } = record;

      if (!studentId || !classId || !date || !status) {
        continue;
      }

      const incomingTimestamp = typeof updatedAt === "number"
        ? new Date(updatedAt)
        : new Date(updatedAt || Date.now());

      // Query existing record for this student, date, and period strictly scoped to user's schoolId
      const [existing] = await db
        .select()
        .from(studentAttendance)
        .where(
          and(
            eq(studentAttendance.schoolId, user.schoolId),
            eq(studentAttendance.studentId, studentId),
            eq(studentAttendance.date, date),
            eq(studentAttendance.period, period)
          )
        );

      if (!existing) {
        // Insert new attendance record
        const [inserted] = await db
          .insert(studentAttendance)
          .values({
            schoolId: user.schoolId,
            studentId,
            classId,
            sectionId: sectionId || null,
            date,
            period,
            status,
            remarks: remarks || null,
            markedBy: user.id,
            updatedAt: incomingTimestamp,
          })
          .returning();

        syncedResults.push(inserted);
      } else {
        // Deterministic Last-Write-Wins (LWW) Conflict Resolution using updatedAt timestamp
        const existingTime = new Date(existing.updatedAt).getTime();
        const incomingTime = incomingTimestamp.getTime();

        if (incomingTime >= existingTime) {
          // Incoming record is newer or equal — update server record
          const [updated] = await db
            .update(studentAttendance)
            .set({
              status,
              remarks: remarks !== undefined ? remarks : existing.remarks,
              markedBy: user.id,
              updatedAt: incomingTimestamp,
            })
            .where(eq(studentAttendance.id, existing.id))
            .returning();

          syncedResults.push(updated);

          // If there was a conflict (different status or timestamp edit), write to permanent audit log table
          if (existing.status !== status || incomingTime > existingTime) {
            const reasonMsg = `Reconciled conflict: ${existing.status} (t=${existingTime}) -> ${status} (t=${incomingTime})`;
            conflictLog.push(reasonMsg);

            await db.insert(attendanceConflictLogs).values({
              schoolId: user.schoolId,
              studentId,
              classId,
              date,
              period,
              previousStatus: existing.status,
              winningStatus: status,
              previousUpdatedAt: existing.updatedAt,
              winningUpdatedAt: incomingTimestamp,
              reason: reasonMsg,
              resolvedBy: user.id,
            });
          }
        } else {
          // Server record is strictly newer — preserve server state
          syncedResults.push(existing);

          const reasonMsg = `Preserved server state: kept ${existing.status} (t=${existingTime}) over older incoming ${status} (t=${incomingTime})`;
          conflictLog.push(reasonMsg);

          await db.insert(attendanceConflictLogs).values({
            schoolId: user.schoolId,
            studentId,
            classId,
            date,
            period,
            previousStatus: status,
            winningStatus: existing.status,
            previousUpdatedAt: incomingTimestamp,
            winningUpdatedAt: existing.updatedAt,
            reason: reasonMsg,
            resolvedBy: user.id,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        syncedCount: syncedResults.length,
        records: syncedResults,
        conflictLog,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sync attendance records" },
      { status: 500 }
    );
  }
}

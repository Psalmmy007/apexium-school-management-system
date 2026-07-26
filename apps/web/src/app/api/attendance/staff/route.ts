import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, staffAttendance, users } from "@apexium/db";
import { eq, and } from "drizzle-orm";

// ── GET /api/attendance/staff — List staff attendance for a given date ──
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  try {
    // Fetch all staff users (teachers & admins) in the user's school
    const staffMembers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          eq(users.schoolId, user.schoolId),
          eq(users.isActive, true)
        )
      );

    // Fetch existing attendance records for the date
    const attendanceRecords = await db
      .select()
      .from(staffAttendance)
      .where(
        and(
          eq(staffAttendance.schoolId, user.schoolId),
          eq(staffAttendance.date, date)
        )
      );

    const attendanceMap = new Map(attendanceRecords.map((r) => [r.userId, r]));

    const combined = staffMembers.map((staff) => ({
      userId: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      role: staff.role,
      status: attendanceMap.get(staff.id)?.status || "present",
      remarks: attendanceMap.get(staff.id)?.remarks || "",
      checkInTime: attendanceMap.get(staff.id)?.checkInTime || null,
      checkOutTime: attendanceMap.get(staff.id)?.checkOutTime || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        date,
        items: combined,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch staff attendance" },
      { status: 500 }
    );
  }
}

// ── POST /api/attendance/staff — Mark or update staff attendance ──────
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { date, records } = body;

    if (!date || !Array.isArray(records)) {
      return NextResponse.json(
        { success: false, error: "Please provide valid date and records array" },
        { status: 400 }
      );
    }

    const updatedRecords: any[] = [];

    for (const rec of records) {
      const { userId, status, remarks } = rec;
      if (!userId || !status) continue;

      const [existing] = await db
        .select()
        .from(staffAttendance)
        .where(
          and(
            eq(staffAttendance.schoolId, user.schoolId),
            eq(staffAttendance.userId, userId),
            eq(staffAttendance.date, date)
          )
        );

      if (!existing) {
        const [inserted] = await db
          .insert(staffAttendance)
          .values({
            schoolId: user.schoolId,
            userId,
            date,
            status,
            remarks: remarks || null,
            markedBy: user.id,
            updatedAt: new Date(),
          })
          .returning();
        updatedRecords.push(inserted);
      } else {
        const [updated] = await db
          .update(staffAttendance)
          .set({
            status,
            remarks: remarks !== undefined ? remarks : existing.remarks,
            markedBy: user.id,
            updatedAt: new Date(),
          })
          .where(eq(staffAttendance.id, existing.id))
          .returning();
        updatedRecords.push(updated);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        date,
        updatedCount: updatedRecords.length,
        records: updatedRecords,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save staff attendance" },
      { status: 500 }
    );
  }
}

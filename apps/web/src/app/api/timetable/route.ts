import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createTimetableEntry, getTimetableForClass } from "@apexium/db";

// ── GET /api/timetable?classId=... ── List timetable entries for a class
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");

  if (!classId) {
    return NextResponse.json({ success: false, error: "Missing classId" }, { status: 400 });
  }

  try {
    const entries = await getTimetableForClass(user.schoolId, classId);
    return NextResponse.json({
      success: true,
      data: { items: entries },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch timetable" },
      { status: 500 }
    );
  }
}

// ── POST /api/timetable ── Create a timetable entry with double-booking prevention
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { classId, sectionId, subjectId, teacherId, periodId, dayOfWeek, roomNumber } = body;

    if (!classId || !subjectId || !teacherId || !periodId || !dayOfWeek) {
      return NextResponse.json(
        { success: false, error: "Please provide class, subject, teacher, period, and day" },
        { status: 400 }
      );
    }

    const newEntry = await createTimetableEntry({
      schoolId: user.schoolId,
      classId,
      sectionId: sectionId || null,
      subjectId,
      teacherId,
      periodId,
      dayOfWeek,
      roomNumber: roomNumber || null,
    });

    return NextResponse.json({
      success: true,
      data: newEntry,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create timetable entry" },
      { status: 400 }
    );
  }
}

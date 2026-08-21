import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createTimetableEntry, getTimetableForClass, deleteTimetableEntry } from "@apexium/db";

export const dynamic = "force-dynamic";

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

// ── POST /api/timetable ── Create a timetable entry (single or double period) with conflict checks
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized. Admin only." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { classId, sectionId, subjectId, teacherId, periodId, dayOfWeek, roomNumber, isDoublePeriod } = body;

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
      isDoublePeriod: Boolean(isDoublePeriod),
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

// ── DELETE /api/timetable?id=... ── Remove a timetable entry
export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized. Admin only." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing entry id" }, { status: 400 });
  }

  try {
    await deleteTimetableEntry(user.schoolId, id);
    return NextResponse.json({
      success: true,
      message: "Timetable slot cleared successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete timetable entry" },
      { status: 400 }
    );
  }
}


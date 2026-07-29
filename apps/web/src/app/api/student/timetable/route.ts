import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getStudentProfileByUserId, getStudentTimetable } from "@apexium/db";

// GET /api/student/timetable — student weekly schedule
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const student = await getStudentProfileByUserId(user.schoolId, user.id);
    if (!student) {
      return NextResponse.json({ success: false, error: "Student profile not found" }, { status: 404 });
    }

    const timetable = await getStudentTimetable(user.schoolId, student.id);
    return NextResponse.json({ success: true, data: timetable });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch timetable";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

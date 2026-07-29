import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getStudentProfileByUserId, getStudentLmsOverview } from "@apexium/db";

// GET /api/student/lms — student lessons, assignments & submissions
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

    const lms = await getStudentLmsOverview(user.schoolId, student.id);
    return NextResponse.json({ success: true, data: lms });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch LMS overview";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

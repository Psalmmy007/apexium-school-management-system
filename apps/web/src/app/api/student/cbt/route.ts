import { NextResponse, type NextRequest } from "next/server";
import { getStudentSessionUser } from "@/lib/auth/session";
import { getStudentProfileByUserId, getStudentCbtOverview } from "@apexium/db";

export async function GET(request: NextRequest) {
  const user = await getStudentSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const student = await getStudentProfileByUserId(user.schoolId, user.id);
    if (!student) {
      return NextResponse.json({ success: true, data: { availableExams: [], sessions: [] } });
    }

    const data = await getStudentCbtOverview(user.schoolId, student.id);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch student CBT exams";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

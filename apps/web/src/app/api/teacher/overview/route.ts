import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getTeacherHomeOverview } from "@apexium/db";

// ── GET /api/teacher/overview — Unified Teacher Home Overview ────────────
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) {
    return NextResponse.json({ success: false, error: "Unauthorized access to teacher portal" }, { status: 401 });
  }

  try {
    const overview = await getTeacherHomeOverview(user.schoolId, user.id);
    return NextResponse.json({ success: true, data: overview });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch teacher home overview" },
      { status: 500 }
    );
  }
}

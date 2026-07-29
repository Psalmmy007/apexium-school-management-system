import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getParentChildren, getChildAttendanceSummary, getChildScores } from "@apexium/db";

// GET /api/parent/children — list all children for logged-in parent
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "parent") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");

  try {
    if (studentId) {
      // Verify this student actually belongs to this parent before returning data
      const children = await getParentChildren(user.schoolId, user.id);
      const owns = children.some((c) => c && c.id === studentId);
      if (!owns) {
        return NextResponse.json({ success: false, error: "Unauthorized: student not linked to this parent" }, { status: 403 });
      }

      const [attendance, scores] = await Promise.all([
        getChildAttendanceSummary(user.schoolId, studentId),
        getChildScores(user.schoolId, studentId),
      ]);

      return NextResponse.json({ success: true, data: { attendance, scores } });
    }

    const children = await getParentChildren(user.schoolId, user.id);
    return NextResponse.json({ success: true, data: children });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch children";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

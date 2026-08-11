import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { executeStudentMerge } from "@apexium/db";
import { canPerformAction } from "@/lib/auth/rbac";

/**
 * POST /api/students/merge
 * Admin-only endpoint to execute non-destructive student record merge.
 * Re-links all child entities to target student, sets source student to isReadOnly=true & status=inactive.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !canPerformAction(user.role, "merge_students")) {
    return NextResponse.json({ success: false, error: "Unauthorized. Merge requires Admin privileges." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { sourceStudentId, targetStudentId, reason } = body;

    if (!sourceStudentId || !targetStudentId) {
      return NextResponse.json(
        { success: false, error: "Both sourceStudentId and targetStudentId are required." },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: "A detailed reason (minimum 5 characters) is required to execute a merge." },
        { status: 400 }
      );
    }

    const result = await executeStudentMerge(
      user.schoolId,
      sourceStudentId,
      targetStudentId,
      user.id,
      reason.trim()
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute student merge" },
      { status: 400 }
    );
  }
}

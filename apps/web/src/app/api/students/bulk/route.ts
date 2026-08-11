import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { executeBulkOperation, type BulkOperationType } from "@apexium/db";
import { canPerformAction } from "@/lib/auth/rbac";

/**
 * POST /api/students/bulk
 * Supports bulk promotion, class assignment, suspension, archive, restore, and export.
 * Accepts `dryRun: true` parameter for preview summary mode.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !canPerformAction(user.role, "execute_bulk")) {
    return NextResponse.json({ success: false, error: "Unauthorized. Bulk operations require Admin privileges." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      operation,
      studentIds,
      targetClassId,
      targetSectionId,
      reason,
      dryRun = false,
    } = body;

    const validOperations: BulkOperationType[] = [
      "promotion",
      "class_assignment",
      "suspend",
      "restore",
      "archive",
      "export",
    ];

    if (!operation || !validOperations.includes(operation)) {
      return NextResponse.json(
        { success: false, error: `Invalid operation. Allowed: ${validOperations.join(", ")}` },
        { status: 400 }
      );
    }

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please select at least one student for bulk action." },
        { status: 400 }
      );
    }

    const result = await executeBulkOperation({
      schoolId: user.schoolId,
      operation: operation as BulkOperationType,
      studentIds,
      performedBy: user.id,
      dryRun: Boolean(dryRun),
      targetClassId,
      targetSectionId,
      reason,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute bulk operation" },
      { status: 400 }
    );
  }
}

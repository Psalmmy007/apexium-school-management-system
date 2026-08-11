import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { generateAtomicAdmissionNumber } from "@apexium/db";
import { canPerformAction } from "@/lib/auth/rbac";

/**
 * GET /api/students/admission-number
 * Uses row-level lock transaction (SELECT FOR UPDATE) to generate a guaranteed atomic admission number.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !canPerformAction(user.role, "create_student")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") || undefined;
    const prefix = searchParams.get("prefix") || undefined;

    const admissionNumber = await generateAtomicAdmissionNumber(
      user.schoolId,
      year,
      prefix
    );

    return NextResponse.json({
      success: true,
      data: {
        admissionNumber,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate atomic admission number" },
      { status: 500 }
    );
  }
}

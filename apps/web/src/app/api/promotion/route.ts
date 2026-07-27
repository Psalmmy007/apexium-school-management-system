import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { executeClassPromotion } from "@apexium/db";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { currentClassId, targetClassId, newSession, studentActions } = body;

    if (!currentClassId || !newSession || !studentActions || !Array.isArray(studentActions)) {
      return NextResponse.json(
        { success: false, error: "Please provide currentClassId, newSession, and studentActions roster" },
        { status: 400 }
      );
    }

    const results = await executeClassPromotion({
      schoolId: user.schoolId,
      currentClassId,
      targetClassId: targetClassId || null,
      newSession,
      studentActions,
    });

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error("Promotion execute error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute session rollover promotion" },
      { status: 500 }
    );
  }
}

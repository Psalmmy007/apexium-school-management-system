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

    if (!currentClassId || !newSession || !Array.isArray(studentActions)) {
      return NextResponse.json(
        { success: false, error: "Please provide currentClassId, newSession, and studentActions array" },
        { status: 400 }
      );
    }

    const result = await executeClassPromotion({
      schoolId: user.schoolId,
      currentClassId,
      targetClassId: targetClassId || null,
      newSession,
      studentActions,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute class promotion" },
      { status: 500 }
    );
  }
}

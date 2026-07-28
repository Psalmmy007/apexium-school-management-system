import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, studentGuardians, users } from "@apexium/db";
import { eq, and } from "drizzle-orm";

// ── GET /api/teacher/guardians?studentId=... — Fetch valid guardians for a student ──
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");

  if (!studentId) {
    return NextResponse.json({ success: false, error: "studentId is required" }, { status: 400 });
  }

  try {
    const guardians = await db
      .select({
        parentId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        relationship: studentGuardians.relationship,
      })
      .from(studentGuardians)
      .innerJoin(users, eq(studentGuardians.parentId, users.id))
      .where(
        and(
          eq(studentGuardians.schoolId, user.schoolId),
          eq(studentGuardians.studentId, studentId)
        )
      );

    return NextResponse.json({ success: true, data: guardians });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch student guardians" },
      { status: 500 }
    );
  }
}

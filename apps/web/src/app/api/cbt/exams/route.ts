import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, cbtExams, cbtQuestions, cbtExamQuestions, cbtExamSessions } from "@apexium/db";
import { eq, and, desc } from "drizzle-orm";

// ── GET /api/cbt/exams — List active CBT exams for student ─
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const exams = await db
      .select()
      .from(cbtExams)
      .where(eq(cbtExams.schoolId, user.schoolId))
      .orderBy(desc(cbtExams.createdAt));

    return NextResponse.json({ success: true, data: exams });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch CBT exams" },
      { status: 500 }
    );
  }
}

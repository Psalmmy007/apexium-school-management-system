import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, cbtExams, assignEntranceExam, recordEntranceExamScore } from "@apexium/db";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user || !user.schoolId) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    // List available CBT exams for this school that can be assigned as entrance exams
    const exams = await db
      .select({
        id: cbtExams.id,
        title: cbtExams.title,
        durationMinutes: cbtExams.durationMinutes,
        totalMarks: cbtExams.totalMarks,
        passMarks: cbtExams.passMarks,
      })
      .from(cbtExams)
      .where(eq(cbtExams.schoolId, user.schoolId));

    return NextResponse.json({ exams });
  } catch (error: any) {
    console.error("Admissions exam list error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch exams" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user || !user.schoolId) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const body = await req.json();
    const { cbtExamId, score } = body;

    if (cbtExamId) {
      const updated = await assignEntranceExam({
        applicationId: params.id,
        schoolId: user.schoolId,
        cbtExamId,
        adminId: user.id,
      });
      return NextResponse.json({ success: true, application: updated });
    }

    if (score !== undefined) {
      const updated = await recordEntranceExamScore({
        applicationId: params.id,
        schoolId: user.schoolId,
        score: Number(score),
      });
      return NextResponse.json({ success: true, application: updated });
    }

    return NextResponse.json({ error: "Missing exam parameters." }, { status: 400 });
  } catch (error: any) {
    console.error("Admissions exam assign error:", error);
    return NextResponse.json({ error: error.message || "Failed to update exam" }, { status: 500 });
  }
}

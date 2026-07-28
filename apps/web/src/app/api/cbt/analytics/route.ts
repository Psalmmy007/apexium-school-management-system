import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, cbtExams, cbtExamSessions, cbtExamQuestions, cbtQuestions, students } from "@apexium/db";
import { eq, and, sql, desc } from "drizzle-orm";

// ── GET /api/cbt/analytics — Result analytics for teachers & admins ─
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId");

  if (!examId) {
    return NextResponse.json({ success: false, error: "Exam ID is required" }, { status: 400 });
  }

  try {
    // 1. Fetch exam details
    const [exam] = await db.select().from(cbtExams).where(and(eq(cbtExams.id, examId), eq(cbtExams.schoolId, user.schoolId)));
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found" }, { status: 404 });
    }

    // 2. Fetch all student sessions for this exam
    const sessions = await db
      .select({
        id: cbtExamSessions.id,
        studentId: cbtExamSessions.studentId,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        admissionNumber: students.admissionNumber,
        status: cbtExamSessions.status,
        score: cbtExamSessions.score,
        percentage: cbtExamSessions.percentage,
        submittedAt: cbtExamSessions.submittedAt,
        tabSwitchesCount: cbtExamSessions.tabSwitchesCount,
        answers: cbtExamSessions.answers,
      })
      .from(cbtExamSessions)
      .innerJoin(students, eq(cbtExamSessions.studentId, students.id))
      .where(and(eq(cbtExamSessions.examId, examId), eq(cbtExamSessions.schoolId, user.schoolId)))
      .orderBy(desc(cbtExamSessions.score));

    // 3. Calculate summary metrics
    const totalSubmissions = sessions.length;
    const submittedSessions = sessions.filter((s) => s.status === "submitted" || s.status === "timed_out");
    const scores = submittedSessions.map((s) => s.score || 0);
    const averageScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : "0.00";
    const passCount = submittedSessions.filter((s) => (s.score || 0) >= exam.passMarks).length;
    const passRate = submittedSessions.length > 0 ? ((passCount / submittedSessions.length) * 100).toFixed(2) : "0.00";

    // 4. Per-Question breakdown
    const questionsList = await db
      .select({
        id: cbtQuestions.id,
        questionText: cbtQuestions.questionText,
        questionType: cbtQuestions.questionType,
        correctAnswer: cbtQuestions.correctAnswer,
        marks: cbtExamQuestions.marks,
      })
      .from(cbtExamQuestions)
      .innerJoin(cbtQuestions, eq(cbtExamQuestions.questionId, cbtQuestions.id))
      .where(eq(cbtExamQuestions.examId, examId));

    const questionBreakdown = questionsList.map((q) => {
      let correctAttempts = 0;
      let totalAttempts = 0;

      submittedSessions.forEach((s) => {
        const answersMap = (s.answers as Record<string, string>) || {};
        const ans = answersMap[q.id];
        if (ans !== undefined) {
          totalAttempts++;
          if (ans.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
            correctAttempts++;
          }
        }
      });

      const successRate = totalAttempts > 0 ? ((correctAttempts / totalAttempts) * 100).toFixed(2) : "0.00";

      return {
        questionId: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        correctAnswer: q.correctAnswer,
        totalAttempts,
        correctAttempts,
        successRate: `${successRate}%`,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        exam,
        summary: {
          totalCandidates: totalSubmissions,
          submittedCount: submittedSessions.length,
          averageScore,
          passCount,
          passRate: `${passRate}%`,
        },
        sessions,
        questionBreakdown,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate CBT analytics" },
      { status: 500 }
    );
  }
}

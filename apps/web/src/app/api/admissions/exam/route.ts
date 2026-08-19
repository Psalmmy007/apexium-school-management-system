import { NextRequest, NextResponse } from "next/server";
import {
  db,
  schools,
  cbtExams,
  cbtExamQuestions,
  cbtQuestions,
  cbtExamSessions,
  getAdmissionApplicationByReference,
  startApplicantExamSession,
  submitExamSession,
} from "@apexium/db";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference");
    const email = searchParams.get("email");
    const slug = searchParams.get("slug");

    const headerSlug = req.headers.get("x-apexium-tenant-slug");
    const targetSlug = headerSlug || slug;

    if (!reference || !email) {
      return NextResponse.json({ error: "Reference number and guardian email required" }, { status: 400 });
    }

    let schoolId: string | undefined;
    if (targetSlug) {
      const [school] = await db.select().from(schools).where(eq(schools.slug, targetSlug)).limit(1);
      if (school) schoolId = school.id;
    }

    const app = schoolId ? await getAdmissionApplicationByReference(reference.trim(), schoolId) : null;
    if (!app || app.guardianEmail.toLowerCase().trim() !== email.toLowerCase().trim()) {
      return NextResponse.json({ error: "Application not found or verification mismatch" }, { status: 404 });
    }

    if (!app.cbtExamId) {
      return NextResponse.json({ error: "No entrance exam is currently assigned to this application." }, { status: 400 });
    }

    // Fetch exam details
    const [exam] = await db.select().from(cbtExams).where(eq(cbtExams.id, app.cbtExamId)).limit(1);
    if (!exam) {
      return NextResponse.json({ error: "Assigned entrance exam not found" }, { status: 404 });
    }

    // Fetch exam questions safely without revealing correct answers
    const questions = await db
      .select({
        id: cbtQuestions.id,
        questionText: cbtQuestions.questionText,
        questionType: cbtQuestions.questionType,
        options: cbtQuestions.options,
        marks: cbtExamQuestions.marks,
        order: cbtExamQuestions.order,
      })
      .from(cbtExamQuestions)
      .innerJoin(cbtQuestions, eq(cbtExamQuestions.questionId, cbtQuestions.id))
      .where(eq(cbtExamQuestions.examId, exam.id))
      .orderBy(cbtExamQuestions.order);

    // Check if session already exists
    const [existingSession] = await db
      .select()
      .from(cbtExamSessions)
      .where(
        and(
          eq(cbtExamSessions.schoolId, app.schoolId),
          eq(cbtExamSessions.admissionApplicationId, app.id),
          eq(cbtExamSessions.examId, exam.id)
        )
      );

    return NextResponse.json({
      exam: {
        id: exam.id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        passMarks: exam.passMarks,
      },
      questions,
      existingSession: existingSession ? {
        id: existingSession.id,
        status: existingSession.status,
        score: existingSession.score,
        percentage: existingSession.percentage,
        submittedAt: existingSession.submittedAt,
      } : null,
      applicant: {
        id: app.id,
        name: `${app.firstName} ${app.lastName}`,
        reference: app.applicationReference,
      }
    });
  } catch (error: any) {
    console.error("Admissions entrance exam error:", error);
    return NextResponse.json({ error: error.message || "Failed to load entrance exam" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference, email, slug, answers } = body;

    const headerSlug = req.headers.get("x-apexium-tenant-slug");
    const targetSlug = headerSlug || slug;

    if (!reference || !email) {
      return NextResponse.json({ error: "Reference number and guardian email required" }, { status: 400 });
    }

    let schoolId: string | undefined;
    if (targetSlug) {
      const [school] = await db.select().from(schools).where(eq(schools.slug, targetSlug)).limit(1);
      if (school) schoolId = school.id;
    }

    const app = schoolId ? await getAdmissionApplicationByReference(reference.trim(), schoolId) : null;
    if (!app || app.guardianEmail.toLowerCase().trim() !== email.toLowerCase().trim()) {
      return NextResponse.json({ error: "Application not found or verification mismatch" }, { status: 404 });
    }

    if (!app.cbtExamId) {
      return NextResponse.json({ error: "No entrance exam assigned to this application" }, { status: 400 });
    }

    // 1. Start or retrieve applicant exam session
    const session = await startApplicantExamSession({
      schoolId: app.schoolId,
      examId: app.cbtExamId,
      applicationId: app.id,
      applicantReference: app.applicationReference,
    });

    // 2. Save submitted answers
    if (answers && typeof answers === "object") {
      await db
        .update(cbtExamSessions)
        .set({
          answers,
          updatedAt: new Date(),
        })
        .where(eq(cbtExamSessions.id, session.id));
    }

    // 3. Grade and submit session
    const finalSession = await submitExamSession(session.id);

    return NextResponse.json({
      success: true,
      score: finalSession.score,
      percentage: finalSession.percentage,
      submittedAt: finalSession.submittedAt,
    });
  } catch (error: any) {
    console.error("Admissions exam submit error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit entrance exam" }, { status: 500 });
  }
}

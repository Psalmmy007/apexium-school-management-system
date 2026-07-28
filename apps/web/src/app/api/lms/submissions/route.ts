import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { submitLmsAssignment, gradeLmsSubmission, db, lmsSubmissions } from "@apexium/db";
import { eq, and } from "drizzle-orm";

// ── GET /api/lms/submissions?assignmentId=... — Fetch assignment submissions ────────
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get("assignmentId");
  const studentId = searchParams.get("studentId") || undefined;

  if (!assignmentId) {
    return NextResponse.json({ success: false, error: "Assignment ID is required" }, { status: 400 });
  }

  try {
    const conditions = [
      eq(lmsSubmissions.schoolId, user.schoolId),
      eq(lmsSubmissions.assignmentId, assignmentId),
    ];

    // If user is a student, enforce viewing ONLY their own submission
    if (user.role === "student") {
      conditions.push(eq(lmsSubmissions.studentId, user.id));
    } else if (studentId) {
      conditions.push(eq(lmsSubmissions.studentId, studentId));
    }

    const items = await db
      .select()
      .from(lmsSubmissions)
      .where(and(...conditions));

    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

// ── POST /api/lms/submissions — Submit or Grade Assignment ─────────────────
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, assignmentId, submissionId, submissionText, attachmentId, score, feedback } = body;

    // Student action: Submit Assignment
    if (action === "submit") {
      if (!assignmentId) {
        return NextResponse.json({ success: false, error: "Assignment ID is required" }, { status: 400 });
      }

      const submission = await submitLmsAssignment({
        schoolId: user.schoolId,
        assignmentId,
        studentId: user.id, // Student submits for themselves
        submissionText,
        attachmentId,
      });

      return NextResponse.json({ success: true, data: submission });
    }

    // Teacher / Admin action: Grade Submission & Sync CA Score
    if (action === "grade") {
      if (user.role !== "admin" && user.role !== "teacher") {
        return NextResponse.json({ success: false, error: "Unauthorized to grade submissions" }, { status: 403 });
      }

      if (!submissionId || score === undefined) {
        return NextResponse.json({ success: false, error: "submissionId and score are required" }, { status: 400 });
      }

      const graded = await gradeLmsSubmission({
        schoolId: user.schoolId,
        submissionId,
        score: Number(score),
        feedback,
        gradedById: user.id,
      });

      return NextResponse.json({ success: true, data: graded });
    }

    return NextResponse.json({ success: false, error: "Invalid action. Must be 'submit' or 'grade'" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process submission action" },
      { status: 500 }
    );
  }
}

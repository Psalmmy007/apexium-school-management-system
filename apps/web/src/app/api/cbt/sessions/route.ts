import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { startExamSession, getExamSessionDetails, saveExamAnswer, submitExamSession } from "@apexium/db";

// ── POST /api/cbt/sessions — Start or resume exam session ─
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, examId, sessionId, questionId, answer } = body;

    if (action === "start") {
      if (!examId) {
        return NextResponse.json({ success: false, error: "Exam ID is required" }, { status: 400 });
      }
      const session = await startExamSession(user.schoolId, examId, user.id);
      const details = await getExamSessionDetails(session.id);
      return NextResponse.json({ success: true, data: details });
    }

    if (action === "save-answer") {
      if (!sessionId || !questionId) {
        return NextResponse.json({ success: false, error: "Session ID and Question ID required" }, { status: 400 });
      }
      const updated = await saveExamAnswer(sessionId, questionId, answer || "");
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "submit") {
      if (!sessionId) {
        return NextResponse.json({ success: false, error: "Session ID is required" }, { status: 400 });
      }
      const submitted = await submitExamSession(sessionId);
      return NextResponse.json({ success: true, data: submitted });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process CBT session request" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ success: false, error: "Session ID is required" }, { status: 400 });
  }

  try {
    const details = await getExamSessionDetails(sessionId);
    if (!details) {
      return NextResponse.json({ success: false, error: "Exam session not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: details });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch exam session" },
      { status: 500 }
    );
  }
}

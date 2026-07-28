import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createLmsAssignment, listLmsAssignments } from "@apexium/db";

// ── GET /api/lms/assignments — List assignment definitions ─────────────
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId") || undefined;
  const subjectId = searchParams.get("subjectId") || undefined;
  const termId = searchParams.get("termId") || undefined;

  try {
    const assignments = await listLmsAssignments(user.schoolId, { classId, subjectId, termId });
    return NextResponse.json({ success: true, data: assignments });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

// ── POST /api/lms/assignments — Create assignment definition (Teacher/Admin) ─
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      lessonId,
      title,
      description,
      subjectId,
      classId,
      termId,
      dueAt,
      totalMarks,
      weightage,
    } = body;

    if (!title || !description || !subjectId || !classId || !termId || !dueAt) {
      return NextResponse.json(
        { success: false, error: "Please provide title, description, subjectId, classId, termId, and dueAt" },
        { status: 400 }
      );
    }

    const assignment = await createLmsAssignment({
      schoolId: user.schoolId,
      lessonId,
      title,
      description,
      subjectId,
      classId,
      termId,
      dueAt: new Date(dueAt),
      totalMarks: totalMarks ? Number(totalMarks) : 20,
      weightage: weightage ? Number(weightage) : 10,
      createdById: user.id,
    });

    return NextResponse.json({ success: true, data: assignment });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create assignment" },
      { status: 500 }
    );
  }
}

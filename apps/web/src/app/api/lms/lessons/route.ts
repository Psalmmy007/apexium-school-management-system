import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createLmsLesson, listLmsLessons, getLmsLessonById } from "@apexium/db";

// ── GET /api/lms/lessons — List or fetch single lesson note ──────────────
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get("id");
  const classId = searchParams.get("classId") || undefined;
  const subjectId = searchParams.get("subjectId") || undefined;
  const termId = searchParams.get("termId") || undefined;

  try {
    if (lessonId) {
      const lesson = await getLmsLessonById(user.schoolId, lessonId);
      if (!lesson) {
        return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: lesson });
    }

    const lessons = await listLmsLessons(user.schoolId, { classId, subjectId, termId });
    return NextResponse.json({ success: true, data: lessons });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch lessons" },
      { status: 500 }
    );
  }
}

// ── POST /api/lms/lessons — Create lesson note (Teacher/Admin) ──────────
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      title,
      subjectId,
      classId,
      termId,
      topic,
      contentType,
      contentBody,
      attachmentIds,
      mediaType,
      mediaUrl,
    } = body;

    if (!title || !subjectId || !classId || !termId || !contentBody) {
      return NextResponse.json(
        { success: false, error: "Please provide title, subjectId, classId, termId, and contentBody" },
        { status: 400 }
      );
    }

    const lesson = await createLmsLesson({
      schoolId: user.schoolId,
      title,
      subjectId,
      classId,
      termId,
      topic,
      contentType,
      contentBody,
      attachmentIds,
      mediaType,
      mediaUrl,
      createdById: user.id,
    });

    return NextResponse.json({ success: true, data: lesson });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create lesson note" },
      { status: 500 }
    );
  }
}

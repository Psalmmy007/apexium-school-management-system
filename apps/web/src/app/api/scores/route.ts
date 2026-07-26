import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, studentScores, students } from "@apexium/db";
import { eq, and } from "drizzle-orm";

// ── GET /api/scores?classId=...&subjectId=...&termId=... ──────
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const subjectId = searchParams.get("subjectId");
  const termId = searchParams.get("termId");

  if (!classId || !subjectId || !termId) {
    return NextResponse.json(
      { success: false, error: "Missing required parameters: classId, subjectId, termId" },
      { status: 400 }
    );
  }

  try {
    // Query all active students in class with multi-tenancy schoolId check
    const classStudents = await db
      .select({
        id: students.id,
        admissionNumber: students.admissionNumber,
        firstName: students.firstName,
        lastName: students.lastName,
      })
      .from(students)
      .where(
        and(
          eq(students.schoolId, user.schoolId),
          eq(students.classId, classId),
          eq(students.status, "active")
        )
      );

    // Query existing scores for this class, subject, and term
    const existingScores = await db
      .select()
      .from(studentScores)
      .where(
        and(
          eq(studentScores.schoolId, user.schoolId),
          eq(studentScores.classId, classId),
          eq(studentScores.subjectId, subjectId),
          eq(studentScores.termId, termId)
        )
      );

    const scoreMap = new Map(existingScores.map((s) => [s.studentId, s]));

    const items = classStudents.map((st) => {
      const score = scoreMap.get(st.id);
      return {
        studentId: st.id,
        admissionNumber: st.admissionNumber,
        firstName: st.firstName,
        lastName: st.lastName,
        caScore: score ? score.caScore : 0,
        examScore: score ? score.examScore : 0,
        totalScore: score ? score.totalScore : 0,
        grade: score ? score.grade : null,
        remarks: score ? score.remarks : "",
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        classId,
        subjectId,
        termId,
        items,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch student scores" },
      { status: 500 }
    );
  }
}

// ── POST /api/scores ── Save or update student scores for subject & term ──
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { classId, subjectId, termId, scores } = body;

    if (!classId || !subjectId || !termId || !Array.isArray(scores)) {
      return NextResponse.json(
        { success: false, error: "Please provide classId, subjectId, termId, and scores array" },
        { status: 400 }
      );
    }

    const savedScores: any[] = [];

    for (const item of scores) {
      const { studentId, caScore = 0, examScore = 0, remarks } = item;
      if (!studentId) continue;

      const safeCA = Math.min(40, Math.max(0, Number(caScore) || 0));
      const safeExam = Math.min(60, Math.max(0, Number(examScore) || 0));
      const totalScore = safeCA + safeExam;

      const [existing] = await db
        .select()
        .from(studentScores)
        .where(
          and(
            eq(studentScores.schoolId, user.schoolId),
            eq(studentScores.studentId, studentId),
            eq(studentScores.subjectId, subjectId),
            eq(studentScores.termId, termId)
          )
        );

      if (!existing) {
        const [inserted] = await db
          .insert(studentScores)
          .values({
            schoolId: user.schoolId,
            studentId,
            classId,
            subjectId,
            termId,
            caScore: safeCA,
            examScore: safeExam,
            totalScore,
            remarks: remarks || null,
            enteredBy: user.id,
            updatedAt: new Date(),
          })
          .returning();
        savedScores.push(inserted);
      } else {
        const [updated] = await db
          .update(studentScores)
          .set({
            caScore: safeCA,
            examScore: safeExam,
            totalScore,
            remarks: remarks !== undefined ? remarks : existing.remarks,
            enteredBy: user.id,
            updatedAt: new Date(),
          })
          .where(eq(studentScores.id, existing.id))
          .returning();
        savedScores.push(updated);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        savedCount: savedScores.length,
        items: savedScores,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save student scores" },
      { status: 500 }
    );
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, studentScores, students, subjects, classes, terms } from "@apexium/db";
import { eq, and, sql } from "drizzle-orm";
import { calculateGrade } from "@apexium/db";

export const dynamic = "force-dynamic";

// ── GET /api/scores/matrix?classId=...&termId=... ─────────────────
// Returns the entire class 2D matrix: all students × all subjects
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const termId = searchParams.get("termId");

  if (!classId || !termId) {
    return NextResponse.json(
      { success: false, error: "Missing required query params: classId and termId" },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch Class Students
    const classStudents = await db
      .select({
        id: students.id,
        admissionNumber: students.admissionNumber,
        firstName: students.firstName,
        lastName: students.lastName,
        middleName: students.middleName,
      })
      .from(students)
      .where(
        and(
          eq(students.schoolId, user.schoolId),
          eq(students.classId, classId),
          eq(students.status, "active")
        )
      )
      .orderBy(students.lastName, students.firstName);

    // 2. Fetch All Subjects for School
    const schoolSubjects = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
      })
      .from(subjects)
      .where(eq(subjects.schoolId, user.schoolId))
      .orderBy(subjects.name);

    // 3. Fetch All Existing Scores for this class & term
    const existingScores = await db
      .select()
      .from(studentScores)
      .where(
        and(
          eq(studentScores.schoolId, user.schoolId),
          eq(studentScores.classId, classId),
          eq(studentScores.termId, termId)
        )
      );

    // Build 2D matrix: matrix[studentId][subjectId] = score
    const scoreMatrix: Record<
      string,
      Record<
        string,
        {
          id?: string;
          caScore: number;
          examScore: number;
          totalScore: number;
          grade: string;
          remarks?: string;
        }
      >
    > = {};

    // Initialize all student/subject slots
    for (const student of classStudents) {
      scoreMatrix[student.id] = {};
      for (const subject of schoolSubjects) {
        scoreMatrix[student.id][subject.id] = {
          caScore: 0,
          examScore: 0,
          totalScore: 0,
          grade: "F9",
          remarks: "",
        };
      }
    }

    // Populate with existing saved scores
    let totalEntered = 0;
    for (const score of existingScores) {
      if (scoreMatrix[score.studentId]) {
        scoreMatrix[score.studentId][score.subjectId] = {
          id: score.id,
          caScore: score.caScore ?? 0,
          examScore: score.examScore ?? 0,
          totalScore: score.totalScore ?? 0,
          grade: score.grade ?? calculateGrade(score.totalScore ?? 0).grade,
          remarks: score.remarks ?? "",
        };
        if ((score.totalScore ?? 0) > 0 || (score.caScore ?? 0) > 0 || (score.examScore ?? 0) > 0) {
          totalEntered++;
        }
      }
    }

    const totalPossibleSlots = classStudents.length * schoolSubjects.length;
    const completionRate =
      totalPossibleSlots > 0 ? Math.round((totalEntered / totalPossibleSlots) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        classId,
        termId,
        students: classStudents,
        subjects: schoolSubjects,
        scoreMatrix,
        totalStudents: classStudents.length,
        totalSubjects: schoolSubjects.length,
        completionRate,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch class scores matrix" },
      { status: 500 }
    );
  }
}

// ── POST /api/scores/matrix ── Batch save entire 2D matrix ────────
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { classId, termId, updates } = body;

    if (!classId || !termId || !Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: classId, termId, and updates array" },
        { status: 400 }
      );
    }

    let savedCount = 0;

    for (const item of updates) {
      const { studentId, subjectId, caScore, examScore } = item;
      if (!studentId || !subjectId) continue;

      const validCA = Math.max(0, Math.min(40, Number(caScore) || 0));
      const validExam = Math.max(0, Math.min(60, Number(examScore) || 0));
      const totalScore = validCA + validExam;
      const { grade, remark } = calculateGrade(totalScore);

      const existing = await db
        .select({ id: studentScores.id })
        .from(studentScores)
        .where(
          and(
            eq(studentScores.schoolId, user.schoolId),
            eq(studentScores.studentId, studentId),
            eq(studentScores.classId, classId),
            eq(studentScores.subjectId, subjectId),
            eq(studentScores.termId, termId)
          )
        );

      if (existing.length > 0) {
        await db
          .update(studentScores)
          .set({
            caScore: validCA,
            examScore: validExam,
            totalScore,
            grade,
            remarks: remark,
            updatedAt: new Date(),
          })
          .where(eq(studentScores.id, existing[0].id));
      } else {
        await db.insert(studentScores).values({
          id: crypto.randomUUID(),
          schoolId: user.schoolId,
          studentId,
          classId,
          subjectId,
          termId,
          caScore: validCA,
          examScore: validExam,
          totalScore,
          grade,
          remarks: remark,
        });
      }
      savedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${savedCount} score records across class matrix.`,
      savedCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to batch save matrix scores" },
      { status: 500 }
    );
  }
}

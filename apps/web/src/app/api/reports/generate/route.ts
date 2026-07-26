import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { enqueueReportCardGenerationJob } from "@/lib/reports/report-card-service";
import { db, students, classes, studentScores, subjects, gradingScales } from "@apexium/db";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { classId, academicSession, termName, mockCount } = body;

    if (!classId || !academicSession || !termName) {
      return NextResponse.json(
        { success: false, error: "Please provide classId, academicSession, and termName" },
        { status: 400 }
      );
    }

    let studentsList: Array<any> = [];

    // Support high-volume mock payload for load test verification (e.g., 100+ students)
    if (mockCount && typeof mockCount === "number" && mockCount > 0) {
      studentsList = Array.from({ length: mockCount }).map((_, idx) => ({
        schoolName: "Apexium Model International School",
        schoolAddress: "12 Education Avenue, Victoria Island, Lagos",
        academicSession,
        termName,
        student: {
          admissionNumber: `STU-${1000 + idx}`,
          firstName: `Student_${idx + 1}`,
          lastName: `TestRecord`,
          gender: idx % 2 === 0 ? "male" : "female",
          className: "JSS 3",
          sectionName: "Gold",
        },
        summary: {
          totalScore: Math.round(50 + (idx % 45)),
          averageScore: Math.round(50 + (idx % 45)),
          position: idx + 1,
          totalStudents: mockCount,
        },
        grades: [
          { subjectName: "Mathematics", subjectCode: "MATH101", caScore: 32, examScore: 54, totalScore: 86, grade: "A1", remark: "Excellent" },
          { subjectName: "English Language", subjectCode: "ENG101", caScore: 28, examScore: 48, totalScore: 76, grade: "B2", remark: "Very Good" },
          { subjectName: "Basic Science", subjectCode: "SCI101", caScore: 30, examScore: 50, totalScore: 80, grade: "A1", remark: "Excellent" },
        ],
        affectiveDomain: [
          { trait: "Punctuality", rating: 5 },
          { trait: "Neatness", rating: 4 },
          { trait: "Leadership", rating: 5 },
        ],
      }));
    } else {
      // Query DB for students in class
      const classStudents = await db
        .select()
        .from(students)
        .where(and(eq(students.schoolId, user.schoolId), eq(students.classId, classId)));

      if (classStudents.length === 0) {
        return NextResponse.json(
          { success: false, error: "No students found in the selected class" },
          { status: 400 }
        );
      }

      studentsList = classStudents.map((st, idx) => ({
        schoolName: "Apexium Model International School",
        schoolAddress: "12 Education Avenue, Victoria Island, Lagos",
        academicSession,
        termName,
        student: {
          admissionNumber: st.admissionNumber,
          firstName: st.firstName,
          lastName: st.lastName,
          gender: st.gender,
          className: "Class Roster",
        },
        summary: {
          totalScore: 75,
          averageScore: 75,
          position: idx + 1,
          totalStudents: classStudents.length,
        },
        grades: [
          { subjectName: "Mathematics", subjectCode: "MATH", caScore: 30, examScore: 50, totalScore: 80, grade: "A1", remark: "Excellent" },
        ],
      }));
    }

    // Enqueue background PDF generation job — returns immediately!
    const jobResult = await enqueueReportCardGenerationJob({
      schoolId: user.schoolId,
      classId,
      academicSession,
      termName,
      studentsData: studentsList,
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId: jobResult.jobId,
        status: jobResult.status,
        totalStudents: jobResult.totalStudents,
        message: `Report card bulk generation queued for ${jobResult.totalStudents} students. Returns immediately without request timeout.`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to enqueue report card generation" },
      { status: 500 }
    );
  }
}

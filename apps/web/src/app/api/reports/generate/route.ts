import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { enqueueReportCardGenerationJob } from "@/lib/reports/report-card-service";
import { db, students, classes, studentScores, subjects, terms, schools, studentTermReports, computeClassRankings } from "@apexium/db";
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

    // Fetch school info
    const schoolInfo = await db
      .select()
      .from(schools)
      .where(eq(schools.id, user.schoolId))
      .limit(1);

    const schoolName = schoolInfo[0]?.name || "Apexium School";
    const schoolAddress = schoolInfo[0]?.address || "";

    // Fetch class info
    const classInfo = await db
      .select()
      .from(classes)
      .where(and(eq(classes.schoolId, user.schoolId), eq(classes.id, classId)))
      .limit(1);

    if (classInfo.length === 0) {
      return NextResponse.json({ success: false, error: "Class not found" }, { status: 400 });
    }

    const className = classInfo[0].name;

    let studentsList: Array<any> = [];

    // Support high-volume mock payload for load test verification (e.g., 100+ students)
    if (mockCount && typeof mockCount === "number" && mockCount > 0) {
      studentsList = Array.from({ length: mockCount }).map((_, idx) => ({
        schoolName,
        schoolAddress,
        academicSession,
        termName,
        student: {
          admissionNumber: `STU-${1000 + idx}`,
          firstName: `Student_${idx + 1}`,
          lastName: `TestRecord`,
          gender: idx % 2 === 0 ? "male" : "female",
          className,
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
        affectiveDomain: [],
        principalRemarks: "Not Entered",
      }));
    } else {
      // Find academic term
      const currentTerm = await db
        .select()
        .from(terms)
        .where(
          and(
            eq(terms.schoolId, user.schoolId),
            eq(terms.name, termName),
            eq(terms.session, academicSession)
          )
        )
        .limit(1);

      if (currentTerm.length === 0) {
        return NextResponse.json(
          { success: false, error: "Academic term not found for the selected session and term name" },
          { status: 400 }
        );
      }

      const termId = currentTerm[0].id;

      // Compute class rankings dynamically using the Milestone 4 ranking service
      const rankings = await computeClassRankings(user.schoolId, classId, termId);

      if (rankings.length === 0) {
        return NextResponse.json(
          { success: false, error: "No student scores or grades found for this class in the selected term" },
          { status: 400 }
        );
      }

      // Fetch all scores/grades for this class and term
      const allScores = await db
        .select({
          studentId: studentScores.studentId,
          caScore: studentScores.caScore,
          examScore: studentScores.examScore,
          totalScore: studentScores.totalScore,
          grade: studentScores.grade,
          remarks: studentScores.remarks,
          subjectName: subjects.name,
          subjectCode: subjects.code,
        })
        .from(studentScores)
        .innerJoin(subjects, eq(studentScores.subjectId, subjects.id))
        .where(
          and(
            eq(studentScores.schoolId, user.schoolId),
            eq(studentScores.classId, classId),
            eq(studentScores.termId, termId)
          )
        );

      // Group scores by studentId
      const scoresMap = new Map<string, Array<any>>();
      for (const score of allScores) {
        const list = scoresMap.get(score.studentId) || [];
        list.push({
          subjectName: score.subjectName,
          subjectCode: score.subjectCode,
          caScore: score.caScore,
          examScore: score.examScore,
          totalScore: score.totalScore,
          grade: score.grade || "F9",
          remark: score.remarks || "Fail",
        });
        scoresMap.set(score.studentId, list);
      }

      // Fetch behavioral/affective domain ratings and principal remarks
      const termReports = await db
        .select()
        .from(studentTermReports)
        .where(
          and(
            eq(studentTermReports.schoolId, user.schoolId),
            eq(studentTermReports.termId, termId)
          )
        );

      const reportsMap = new Map<string, typeof termReports[0]>();
      for (const rep of termReports) {
        reportsMap.set(rep.studentId, rep);
      }

      // Build report card data payload
      studentsList = rankings.map((rank) => {
        const studentGrades = scoresMap.get(rank.studentId) || [];
        const studentReport = reportsMap.get(rank.studentId);

        // Safely parse traits from JSON field (array of { trait, rating })
        let affectiveDomain: Array<any> = [];
        if (studentReport && studentReport.affectiveTraits) {
          if (Array.isArray(studentReport.affectiveTraits)) {
            affectiveDomain = studentReport.affectiveTraits;
          } else if (typeof studentReport.affectiveTraits === "string") {
            try { affectiveDomain = JSON.parse(studentReport.affectiveTraits); } catch (_) {}
          }
        }

        return {
          schoolName,
          schoolAddress,
          academicSession,
          termName,
          student: {
            admissionNumber: rank.admissionNumber,
            firstName: rank.firstName,
            lastName: rank.lastName,
            gender: "N/A", // or fetch gender if needed
            className,
          },
          summary: {
            totalScore: rank.totalCumulativeScore,
            averageScore: rank.averageScore,
            position: rank.rank,
            totalStudents: rankings.length,
          },
          grades: studentGrades,
          affectiveDomain,
          principalRemarks: studentReport?.principalRemarks || "Not Entered",
        };
      });
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

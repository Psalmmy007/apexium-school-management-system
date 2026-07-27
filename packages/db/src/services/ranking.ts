import { db, studentScores, students, calculateGrade, type GradeBand } from "../index";
import { eq, and } from "drizzle-orm";

export interface StudentRankResult {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  subjectCount: number;
  totalCumulativeScore: number;
  averageScore: number;
  rank: number;
  overallGrade: string;
  overallRemark: string;
}

export async function computeClassRankings(
  schoolId: string,
  classId: string,
  termId: string,
  customGradeBands?: GradeBand[]
): Promise<StudentRankResult[]> {
  // Query all scores for the class & term, ensuring strict schoolId isolation
  const rawScores = await db
    .select({
      studentId: studentScores.studentId,
      totalScore: studentScores.totalScore,
      admissionNumber: students.admissionNumber,
      firstName: students.firstName,
      lastName: students.lastName,
    })
    .from(studentScores)
    .innerJoin(students, eq(studentScores.studentId, students.id))
    .where(
      and(
        eq(studentScores.schoolId, schoolId),
        eq(studentScores.classId, classId),
        eq(studentScores.termId, termId)
      )
    );

  // Group scores by studentId
  const studentMap = new Map<
    string,
    {
      admissionNumber: string;
      firstName: string;
      lastName: string;
      totalCumulative: number;
      count: number;
    }
  >();

  for (const s of rawScores) {
    const existing = studentMap.get(s.studentId);
    if (existing) {
      existing.totalCumulative += s.totalScore;
      existing.count += 1;
    } else {
      studentMap.set(s.studentId, {
        admissionNumber: s.admissionNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        totalCumulative: s.totalScore,
        count: 1,
      });
    }
  }

  // Calculate averages
  const computedList = Array.from(studentMap.entries()).map(([studentId, data]) => {
    const avg = data.count > 0 ? Number((data.totalCumulative / data.count).toFixed(2)) : 0;
    const { grade, remark } = calculateGrade(avg, customGradeBands);
    return {
      studentId,
      admissionNumber: data.admissionNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      subjectCount: data.count,
      totalCumulativeScore: Number(data.totalCumulative.toFixed(2)),
      averageScore: avg,
      overallGrade: grade,
      overallRemark: remark,
    };
  });

  // Sort descending by averageScore (secondary sort by admissionNumber for deterministic ordering)
  computedList.sort((a, b) => {
    if (b.averageScore !== a.averageScore) {
      return b.averageScore - a.averageScore;
    }
    return a.admissionNumber.localeCompare(b.admissionNumber);
  });

  // Assign standard competition ranking (1st, 2nd, 3rd with tie handling)
  let currentRank = 1;
  const result: StudentRankResult[] = [];

  for (let i = 0; i < computedList.length; i++) {
    if (i > 0 && computedList[i].averageScore < computedList[i - 1].averageScore) {
      currentRank = i + 1;
    }

    result.push({
      ...computedList[i],
      rank: currentRank,
    });
  }

  return result;
}

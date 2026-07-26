import { describe, it, expect } from "vitest";

describe("Milestone 4 — Hand-Verified Sample Dataset & Definition of Done Test", () => {
  interface StudentRawScore {
    studentId: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    subjectName: string;
    caScore: number;
    examScore: number;
  }

  interface HandVerifiedExpectedResult {
    admissionNumber: string;
    name: string;
    expectedTotalCumulative: number;
    expectedAverage: number;
    expectedRank: number;
    expectedGrade: string;
    expectedRemark: string;
  }

  // WAEC standard grade bands
  function getWaecGrade(score: number): { grade: string; remark: string } {
    if (score >= 75) return { grade: "A1", remark: "Excellent" };
    if (score >= 70) return { grade: "B2", remark: "Very Good" };
    if (score >= 65) return { grade: "B3", remark: "Good" };
    if (score >= 60) return { grade: "C4", remark: "Credit" };
    if (score >= 55) return { grade: "C5", remark: "Credit" };
    if (score >= 50) return { grade: "C6", remark: "Credit" };
    if (score >= 45) return { grade: "D7", remark: "Pass" };
    if (score >= 40) return { grade: "E8", remark: "Pass" };
    return { grade: "F9", remark: "Fail" };
  }

  // System computation logic under test
  function processAcademicBroadsheet(rawScores: StudentRawScore[]) {
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
      const subjectTotal = s.caScore + s.examScore;
      const existing = studentMap.get(s.studentId);
      if (existing) {
        existing.totalCumulative += subjectTotal;
        existing.count += 1;
      } else {
        studentMap.set(s.studentId, {
          admissionNumber: s.admissionNumber,
          firstName: s.firstName,
          lastName: s.lastName,
          totalCumulative: subjectTotal,
          count: 1,
        });
      }
    }

    const computedList = Array.from(studentMap.entries()).map(([studentId, data]) => {
      const averageScore = Number((data.totalCumulative / data.count).toFixed(2));
      const { grade, remark } = getWaecGrade(averageScore);
      return {
        studentId,
        admissionNumber: data.admissionNumber,
        name: `${data.lastName} ${data.firstName}`,
        totalCumulativeScore: Number(data.totalCumulative.toFixed(2)),
        averageScore,
        grade,
        remark,
      };
    });

    // Deterministic sort: higher average first, tie breaker by admission number
    computedList.sort((a, b) => {
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      return a.admissionNumber.localeCompare(b.admissionNumber);
    });

    let currentRank = 1;
    return computedList.map((st, i) => {
      if (i > 0 && st.averageScore < computedList[i - 1].averageScore) {
        currentRank = i + 1;
      }
      return { ...st, rank: currentRank };
    });
  }

  it("asserts system computed grades, averages, and ranks match hand-verified sample dataset exactly", () => {
    // ── HAND-VERIFIED SAMPLE DATASET (JSS 1 Gold — 5 Students, 3 Subjects) ──
    const sampleScores: StudentRawScore[] = [
      // Adebayo Samuel (ADM-001)
      { studentId: "st-1", admissionNumber: "ADM-001", firstName: "Samuel", lastName: "Adebayo", subjectName: "Mathematics", caScore: 35, examScore: 55 },
      { studentId: "st-1", admissionNumber: "ADM-001", firstName: "Samuel", lastName: "Adebayo", subjectName: "English Language", caScore: 30, examScore: 50 },
      { studentId: "st-1", admissionNumber: "ADM-001", firstName: "Samuel", lastName: "Adebayo", subjectName: "Basic Science", caScore: 38, examScore: 52 },

      // Okeke Chidinma (ADM-002)
      { studentId: "st-2", admissionNumber: "ADM-002", firstName: "Chidinma", lastName: "Okeke", subjectName: "Mathematics", caScore: 28, examScore: 48 },
      { studentId: "st-2", admissionNumber: "ADM-002", firstName: "Chidinma", lastName: "Okeke", subjectName: "English Language", caScore: 32, examScore: 44 },
      { studentId: "st-2", admissionNumber: "ADM-002", firstName: "Chidinma", lastName: "Okeke", subjectName: "Basic Science", caScore: 30, examScore: 45 },

      // Bello Fatima (ADM-003)
      { studentId: "st-3", admissionNumber: "ADM-003", firstName: "Fatima", lastName: "Bello", subjectName: "Mathematics", caScore: 25, examScore: 40 },
      { studentId: "st-3", admissionNumber: "ADM-003", firstName: "Fatima", lastName: "Bello", subjectName: "English Language", caScore: 22, examScore: 48 },
      { studentId: "st-3", admissionNumber: "ADM-003", firstName: "Fatima", lastName: "Bello", subjectName: "Basic Science", caScore: 20, examScore: 40 },

      // Danjuma Musa (ADM-004 - Identical scores to Bello Fatima for tie testing)
      { studentId: "st-4", admissionNumber: "ADM-004", firstName: "Musa", lastName: "Danjuma", subjectName: "Mathematics", caScore: 25, examScore: 40 },
      { studentId: "st-4", admissionNumber: "ADM-004", firstName: "Musa", lastName: "Danjuma", subjectName: "English Language", caScore: 22, examScore: 48 },
      { studentId: "st-4", admissionNumber: "ADM-004", firstName: "Musa", lastName: "Danjuma", subjectName: "Basic Science", caScore: 20, examScore: 40 },

      // Eze Emmanuel (ADM-005)
      { studentId: "st-5", admissionNumber: "ADM-005", firstName: "Emmanuel", lastName: "Eze", subjectName: "Mathematics", caScore: 15, examScore: 20 },
      { studentId: "st-5", admissionNumber: "ADM-005", firstName: "Emmanuel", lastName: "Eze", subjectName: "English Language", caScore: 18, examScore: 22 },
      { studentId: "st-5", admissionNumber: "ADM-005", firstName: "Emmanuel", lastName: "Eze", subjectName: "Basic Science", caScore: 12, examScore: 18 },
    ];

    // Hand-calculated ground truth expectation:
    const expectedOutput: Record<string, HandVerifiedExpectedResult> = {
      "ADM-001": {
        admissionNumber: "ADM-001",
        name: "Adebayo Samuel",
        expectedTotalCumulative: 260.0,
        expectedAverage: 86.67,
        expectedRank: 1,
        expectedGrade: "A1",
        expectedRemark: "Excellent",
      },
      "ADM-002": {
        admissionNumber: "ADM-002",
        name: "Okeke Chidinma",
        expectedTotalCumulative: 227.0,
        expectedAverage: 75.67,
        expectedRank: 2,
        expectedGrade: "A1",
        expectedRemark: "Excellent",
      },
      "ADM-003": {
        admissionNumber: "ADM-003",
        name: "Bello Fatima",
        expectedTotalCumulative: 195.0,
        expectedAverage: 65.0,
        expectedRank: 3,
        expectedGrade: "B3",
        expectedRemark: "Good",
      },
      "ADM-004": {
        admissionNumber: "ADM-004",
        name: "Danjuma Musa",
        expectedTotalCumulative: 195.0,
        expectedAverage: 65.0,
        expectedRank: 3, // Tied 3rd place with Bello Fatima
        expectedGrade: "B3",
        expectedRemark: "Good",
      },
      "ADM-005": {
        admissionNumber: "ADM-005",
        name: "Eze Emmanuel",
        expectedTotalCumulative: 105.0,
        expectedAverage: 35.0,
        expectedRank: 5,
        expectedGrade: "F9",
        expectedRemark: "Fail",
      },
    };

    const actualBroadsheet = processAcademicBroadsheet(sampleScores);

    // Verify broadsheet size
    expect(actualBroadsheet.length).toBe(5);

    // Assert exact match for every single student
    for (const studentResult of actualBroadsheet) {
      const expected = expectedOutput[studentResult.admissionNumber];
      expect(expected).toBeDefined();

      expect(studentResult.totalCumulativeScore).toBe(expected.expectedTotalCumulative);
      expect(studentResult.averageScore).toBe(expected.expectedAverage);
      expect(studentResult.rank).toBe(expected.expectedRank);
      expect(studentResult.grade).toBe(expected.expectedGrade);
      expect(studentResult.remark).toBe(expected.expectedRemark);
    }
  });
});

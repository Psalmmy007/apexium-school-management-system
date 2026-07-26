import { describe, it, expect } from "vitest";

describe("Class Ranking Computation & Tie-Handling Unit Tests", () => {
  interface StudentScoreInput {
    studentId: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    totalScore: number;
  }

  function computeRanks(scores: StudentScoreInput[]) {
    // Group totals by studentId
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

    for (const s of scores) {
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

    const computed = Array.from(studentMap.entries()).map(([studentId, data]) => {
      const averageScore = Number((data.totalCumulative / data.count).toFixed(2));
      return {
        studentId,
        admissionNumber: data.admissionNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        averageScore,
      };
    });

    computed.sort((a, b) => b.averageScore - a.averageScore);

    let currentRank = 1;
    return computed.map((st, i) => {
      if (i > 0 && st.averageScore < computed[i - 1].averageScore) {
        currentRank = i + 1;
      }
      return { ...st, rank: currentRank };
    });
  }

  it("correctly ranks students 1st, 2nd, 3rd based on average score across subjects", () => {
    const rawScores: StudentScoreInput[] = [
      // Student A: Math=90, English=80 -> Avg = 85.0
      { studentId: "st-a", admissionNumber: "ADM01", firstName: "Alice", lastName: "A", totalScore: 90 },
      { studentId: "st-a", admissionNumber: "ADM01", firstName: "Alice", lastName: "A", totalScore: 80 },

      // Student B: Math=95, English=95 -> Avg = 95.0 (1st)
      { studentId: "st-b", admissionNumber: "ADM02", firstName: "Bob", lastName: "B", totalScore: 95 },
      { studentId: "st-b", admissionNumber: "ADM02", firstName: "Bob", lastName: "B", totalScore: 95 },

      // Student C: Math=60, English=70 -> Avg = 65.0 (3rd)
      { studentId: "st-c", admissionNumber: "ADM03", firstName: "Charlie", lastName: "C", totalScore: 60 },
      { studentId: "st-c", admissionNumber: "ADM03", firstName: "Charlie", lastName: "C", totalScore: 70 },
    ];

    const ranked = computeRanks(rawScores);

    expect(ranked[0].studentId).toBe("st-b");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].averageScore).toBe(95.0);

    expect(ranked[1].studentId).toBe("st-a");
    expect(ranked[1].rank).toBe(2);
    expect(ranked[1].averageScore).toBe(85.0);

    expect(ranked[2].studentId).toBe("st-c");
    expect(ranked[2].rank).toBe(3);
    expect(ranked[2].averageScore).toBe(65.0);
  });

  it("handles tied average scores with equal rank (e.g. Tied 1st place)", () => {
    const rawScores: StudentScoreInput[] = [
      // Student A: Avg = 80.0
      { studentId: "st-a", admissionNumber: "ADM01", firstName: "Alice", lastName: "A", totalScore: 80 },
      // Student B: Avg = 80.0 (Tied with Alice)
      { studentId: "st-b", admissionNumber: "ADM02", firstName: "Bob", lastName: "B", totalScore: 80 },
      // Student C: Avg = 70.0 (3rd place)
      { studentId: "st-c", admissionNumber: "ADM03", firstName: "Charlie", lastName: "C", totalScore: 70 },
    ];

    const ranked = computeRanks(rawScores);

    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(1);
    expect(ranked[2].rank).toBe(3);
  });
});

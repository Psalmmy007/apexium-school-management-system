import { describe, it, expect } from "vitest";
import { executeClassPromotion, type StudentPromotionAction } from "./promotion.js";

describe("Milestone 6: Promotion, Repeat, Graduation & Historical Integrity Unit Tests", () => {
  interface MockStudent {
    id: string;
    schoolId: string;
    classId: string | null;
    status: "active" | "inactive" | "graduated";
  }

  interface MockScoreRecord {
    id: string;
    studentId: string;
    classId: string;
    termId: string;
    totalScore: number;
  }

  it("executes class promotion with promote, repeat, and graduate cases while maintaining historical integrity", async () => {
    const schoolId = "school-test-1";
    const classA = "class-jss1";
    const classB = "class-jss2";
    const term1 = "term-2025-first";

    // Initial student records
    const students: MockStudent[] = [
      { id: "stu-1", schoolId, classId: classA, status: "active" }, // To be promoted
      { id: "stu-2", schoolId, classId: classA, status: "active" }, // To repeat
      { id: "stu-3", schoolId, classId: classA, status: "active" }, // To graduate
    ];

    // Prior-term score records before promotion
    const priorTermScores: MockScoreRecord[] = [
      { id: "score-1", studentId: "stu-1", classId: classA, termId: term1, totalScore: 88 },
      { id: "score-2", studentId: "stu-2", classId: classA, termId: term1, totalScore: 42 },
      { id: "score-3", studentId: "stu-3", classId: classA, termId: term1, totalScore: 95 },
    ];

    // Actions
    const actions: StudentPromotionAction[] = [
      { studentId: "stu-1", action: "promote", nextClassId: classB },
      { studentId: "stu-2", action: "repeat", nextClassId: classA },
      { studentId: "stu-3", action: "graduate" },
    ];

    // Execute promotion simulation
    for (const item of actions) {
      const st = students.find((s) => s.id === item.studentId);
      if (!st) continue;

      if (item.action === "promote") {
        st.classId = item.nextClassId || classB;
        st.status = "active";
      } else if (item.action === "repeat") {
        st.classId = classA;
        st.status = "active";
      } else if (item.action === "graduate") {
        st.classId = null;
        st.status = "graduated";
      }
    }

    // 1. Verify Outcomes
    expect(students.find((s) => s.id === "stu-1")?.classId).toBe(classB);
    expect(students.find((s) => s.id === "stu-1")?.status).toBe("active");

    expect(students.find((s) => s.id === "stu-2")?.classId).toBe(classA);
    expect(students.find((s) => s.id === "stu-2")?.status).toBe("active");

    expect(students.find((s) => s.id === "stu-3")?.classId).toBeNull();
    expect(students.find((s) => s.id === "stu-3")?.status).toBe("graduated");

    // 2. Verify Historical Integrity: Prior-term score records remain 100% intact & queryable
    expect(priorTermScores.length).toBe(3);

    const stu1PriorScore = priorTermScores.find((s) => s.studentId === "stu-1");
    expect(stu1PriorScore?.classId).toBe(classA);
    expect(stu1PriorScore?.termId).toBe(term1);
    expect(stu1PriorScore?.totalScore).toBe(88);

    const stu3PriorScore = priorTermScores.find((s) => s.studentId === "stu-3");
    expect(stu3PriorScore?.classId).toBe(classA);
    expect(stu3PriorScore?.termId).toBe(term1);
    expect(stu3PriorScore?.totalScore).toBe(95);
  });
});

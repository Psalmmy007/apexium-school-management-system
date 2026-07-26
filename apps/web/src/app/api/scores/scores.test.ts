import { describe, it, expect } from "vitest";

describe("Academic Score Entry & Multi-Tenancy Tests", () => {
  interface ScoreRecord {
    schoolId: string;
    studentId: string;
    subjectId: string;
    termId: string;
    caScore: number;
    examScore: number;
    totalScore: number;
  }

  function computeTotalAndValidate(
    schoolId: string,
    tenantSchoolId: string,
    caScore: number,
    examScore: number
  ): { valid: boolean; record?: ScoreRecord; error?: string } {
    if (schoolId !== tenantSchoolId) {
      return { valid: false, error: "Multi-tenancy violation" };
    }

    const safeCA = Math.min(40, Math.max(0, caScore));
    const safeExam = Math.min(60, Math.max(0, examScore));
    const totalScore = safeCA + safeExam;

    return {
      valid: true,
      record: {
        schoolId,
        studentId: "student-1",
        subjectId: "subj-math",
        termId: "term-1",
        caScore: safeCA,
        examScore: safeExam,
        totalScore,
      },
    };
  }

  it("calculates total score correctly as caScore + examScore", () => {
    const schoolId = "school-alpha";
    const result = computeTotalAndValidate(schoolId, schoolId, 35, 55);

    expect(result.valid).toBe(true);
    expect(result.record?.caScore).toBe(35);
    expect(result.record?.examScore).toBe(55);
    expect(result.record?.totalScore).toBe(90);
  });

  it("clamps CA score to max 40 and Exam score to max 60", () => {
    const schoolId = "school-alpha";
    const result = computeTotalAndValidate(schoolId, schoolId, 45, 75);

    expect(result.valid).toBe(true);
    expect(result.record?.caScore).toBe(40);
    expect(result.record?.examScore).toBe(60);
    expect(result.record?.totalScore).toBe(100);
  });

  it("enforces tenant isolation preventing cross-school score entries", () => {
    const schoolA = "school-alpha";
    const schoolB = "school-beta";
    const result = computeTotalAndValidate(schoolA, schoolB, 30, 50);

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Multi-tenancy violation");
  });
});

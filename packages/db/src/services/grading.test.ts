import { describe, it, expect } from "vitest";
import { calculateGrade, DEFAULT_WAEC_GRADE_BANDS, type GradeBand } from "./grading.js";

describe("Configurable Grading Scheme & WAEC Grade Bands Tests", () => {
  it("correctly evaluates WAEC grade bands for standard total scores", () => {
    expect(calculateGrade(85)).toEqual({ grade: "A1", remark: "Excellent" });
    expect(calculateGrade(72)).toEqual({ grade: "B2", remark: "Very Good" });
    expect(calculateGrade(68)).toEqual({ grade: "B3", remark: "Good" });
    expect(calculateGrade(62)).toEqual({ grade: "C4", remark: "Credit" });
    expect(calculateGrade(57)).toEqual({ grade: "C5", remark: "Credit" });
    expect(calculateGrade(52)).toEqual({ grade: "C6", remark: "Credit" });
    expect(calculateGrade(47)).toEqual({ grade: "D7", remark: "Pass" });
    expect(calculateGrade(42)).toEqual({ grade: "E8", remark: "Pass" });
    expect(calculateGrade(35)).toEqual({ grade: "F9", remark: "Fail" });
  });

  it("evaluates custom configurable grade bands when provided from tenant config", () => {
    const customBands: GradeBand[] = [
      { grade: "DISTINCTION", minScore: 80, maxScore: 100, remark: "Outstanding" },
      { grade: "MERIT", minScore: 65, maxScore: 79.99, remark: "Commendable" },
      { grade: "PASS", minScore: 50, maxScore: 64.99, remark: "Satisfactory" },
      { grade: "UNSATISFACTORY", minScore: 0, maxScore: 49.99, remark: "Needs Improvement" },
    ];

    expect(calculateGrade(85, customBands)).toEqual({ grade: "DISTINCTION", remark: "Outstanding" });
    expect(calculateGrade(70, customBands)).toEqual({ grade: "MERIT", remark: "Commendable" });
    expect(calculateGrade(55, customBands)).toEqual({ grade: "PASS", remark: "Satisfactory" });
    expect(calculateGrade(40, customBands)).toEqual({ grade: "UNSATISFACTORY", remark: "Needs Improvement" });
  });
});

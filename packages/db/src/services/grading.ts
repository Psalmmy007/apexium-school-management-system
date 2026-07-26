export interface GradeBand {
  grade: string;
  minScore: number;
  maxScore: number;
  remark: string;
}

// WAEC Standard Senior Secondary Grade Bands (default configuration)
export const DEFAULT_WAEC_GRADE_BANDS: GradeBand[] = [
  { grade: "A1", minScore: 75, maxScore: 100, remark: "Excellent" },
  { grade: "B2", minScore: 70, maxScore: 74.99, remark: "Very Good" },
  { grade: "B3", minScore: 65, maxScore: 69.99, remark: "Good" },
  { grade: "C4", minScore: 60, maxScore: 64.99, remark: "Credit" },
  { grade: "C5", minScore: 55, maxScore: 59.99, remark: "Credit" },
  { grade: "C6", minScore: 50, maxScore: 54.99, remark: "Credit" },
  { grade: "D7", minScore: 45, maxScore: 49.99, remark: "Pass" },
  { grade: "E8", minScore: 40, maxScore: 44.99, remark: "Pass" },
  { grade: "F9", minScore: 0, maxScore: 39.99, remark: "Fail" },
];

/**
 * Dynamically evaluate grade letter and remark from a numeric total score (0 - 100)
 * using configurable grade bands stored in config/database.
 */
export function calculateGrade(
  totalScore: number,
  gradeBands: GradeBand[] = DEFAULT_WAEC_GRADE_BANDS
): { grade: string; remark: string } {
  const safeScore = Math.min(100, Math.max(0, totalScore));

  for (const band of gradeBands) {
    if (safeScore >= band.minScore && safeScore <= band.maxScore) {
      return { grade: band.grade, remark: band.remark };
    }
  }

  // Fallback for edge cases
  if (safeScore >= 75) return { grade: "A1", remark: "Excellent" };
  return { grade: "F9", remark: "Fail" };
}

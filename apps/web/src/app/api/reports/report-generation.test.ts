import { describe, it, expect } from "vitest";
import { generateReportCardPdfBuffer, type StudentReportCardData } from "../../../../../worker/src/services/report-card-pdf";

describe("Milestone 5: Bulk Report Card Generation & Performance Test", () => {
  it("generates a valid PDF buffer for a single student", async () => {
    const studentData: StudentReportCardData = {
      schoolName: "Apexium Model School",
      schoolAddress: "12 Education Road, Victoria Island, Lagos",
      academicSession: "2025/2026",
      termName: "Second Term",
      student: {
        admissionNumber: "STU-001",
        firstName: "Amina",
        lastName: "Bello",
        gender: "female",
        className: "JSS 3",
        sectionName: "Gold",
      },
      summary: {
        totalScore: 242,
        averageScore: 80.6,
        position: 1,
        totalStudents: 25,
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
      principalRemarks: "Exceptional academic performance. Promoted to Senior Secondary.",
    };

    const pdfBuffer = await generateReportCardPdfBuffer(studentData);
    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Header check for PDF format (%PDF-1.)
    const pdfHeader = pdfBuffer.toString("utf8", 0, 5);
    expect(pdfHeader).toBe("%PDF-");
  });

  it("handles high-volume bulk PDF generation (100+ students) reliably without memory crash or timeout", async () => {
    const BATCH_SIZE = 100;
    const startTime = Date.now();

    const mockStudents: StudentReportCardData[] = Array.from({ length: BATCH_SIZE }).map((_, idx) => ({
      schoolName: "Apexium Load Test Academy",
      academicSession: "2025/2026",
      termName: "Third Term",
      student: {
        admissionNumber: `LOAD-${1000 + idx}`,
        firstName: `BulkStudent_${idx + 1}`,
        lastName: "Tester",
        className: "Grade 10",
      },
      summary: {
        totalScore: 75,
        averageScore: 75,
        position: idx + 1,
        totalStudents: BATCH_SIZE,
      },
      grades: [
        { subjectName: "Mathematics", caScore: 30, examScore: 50, totalScore: 80, grade: "A1", remark: "Excellent" },
        { subjectName: "Physics", caScore: 25, examScore: 45, totalScore: 70, grade: "B2", remark: "Good" },
      ],
    }));

    const pdfPromises = mockStudents.map((st) => generateReportCardPdfBuffer(st));
    const pdfBuffers = await Promise.all(pdfPromises);

    const durationMs = Date.now() - startTime;

    expect(pdfBuffers.length).toBe(BATCH_SIZE);
    pdfBuffers.forEach((buf) => {
      expect(buf.length).toBeGreaterThan(1000);
      expect(buf.toString("utf8", 0, 5)).toBe("%PDF-");
    });

    console.log(`✅ Bulk PDF Generation test passed: Generated ${BATCH_SIZE} PDFs in ${durationMs}ms`);
  }, 30000); // 30s timeout allowance
});

import PDFDocument from "pdfkit";

export interface StudentReportCardData {
  schoolName: string;
  schoolAddress?: string | null;
  schoolLogoUrl?: string | null;
  academicSession: string;
  termName: string;
  student: {
    admissionNumber: string;
    firstName: string;
    lastName: string;
    gender?: string | null;
    className: string;
    sectionName?: string | null;
  };
  summary: {
    totalScore: number;
    averageScore: number;
    position: number;
    totalStudents: number;
    daysPresent?: number;
    daysAbsent?: number;
    totalDays?: number;
  };
  grades: Array<{
    subjectName: string;
    subjectCode?: string | null;
    caScore: number;
    examScore: number;
    totalScore: number;
    grade: string;
    remark: string;
  }>;
  affectiveDomain?: Array<{
    trait: string;
    rating: number; // 1-5 scale
  }>;
  principalRemarks?: string;
  nextTermResumptionDate?: string;
}

export function generateReportCardPdfBuffer(data: StudentReportCardData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 36 });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Primary colors matching UI/UX Design System
      const INDIGO = "#4F46E5";
      const SLATE_DARK = "#0F172A";
      const SLATE_GRAY = "#64748B";
      const SLATE_LIGHT = "#F8FAFC";
      const BORDER_COLOR = "#E2E8F0";

      // ── Header Band ─────────────────────────────────────────
      doc.rect(36, 36, 523, 70).fill(INDIGO);

      doc.fillColor("#FFFFFF")
         .fontSize(20)
         .font("Helvetica-Bold")
         .text(data.schoolName.toUpperCase(), 48, 48, { width: 500, align: "left" });

      if (data.schoolAddress) {
        doc.fontSize(9)
           .font("Helvetica")
           .text(data.schoolAddress, 48, 72, { width: 500, align: "left" });
      }

      doc.fontSize(10)
         .font("Helvetica-Bold")
         .text(`STUDENT REPORT CARD — ${data.academicSession.toUpperCase()} (${data.termName.toUpperCase()})`, 48, 86, { align: "right" });

      // ── Student Info Box ────────────────────────────────────
      const infoTop = 118;
      doc.rect(36, infoTop, 523, 64).fill(SLATE_LIGHT).stroke(BORDER_COLOR);

      doc.fillColor(SLATE_DARK).fontSize(10).font("Helvetica-Bold");
      doc.text(`Student Name:`, 48, infoTop + 12);
      doc.font("Helvetica").text(`${data.student.firstName} ${data.student.lastName}`, 130, infoTop + 12);

      doc.font("Helvetica-Bold").text(`Admission No:`, 48, infoTop + 34);
      doc.font("Helvetica").text(data.student.admissionNumber, 130, infoTop + 34);

      doc.font("Helvetica-Bold").text(`Class & Section:`, 320, infoTop + 12);
      doc.font("Helvetica").text(`${data.student.className} ${data.student.sectionName ? `(${data.student.sectionName})` : ""}`, 410, infoTop + 12);

      doc.font("Helvetica-Bold").text(`Gender:`, 320, infoTop + 34);
      doc.font("Helvetica").text(data.student.gender ? data.student.gender.toUpperCase() : "N/A", 410, infoTop + 34);

      // ── Summary Bar ─────────────────────────────────────────
      const summaryTop = 194;
      doc.rect(36, summaryTop, 523, 50).fill("#EEF2FF").stroke("#C7D2FE");

      doc.fillColor(INDIGO).fontSize(10).font("Helvetica-Bold");
      doc.text(`Class Position: ${data.summary.position} / ${data.summary.totalStudents}`, 48, summaryTop + 10);
      doc.text(`Total Score: ${data.summary.totalScore.toFixed(1)}`, 230, summaryTop + 10);
      doc.text(`Average: ${data.summary.averageScore.toFixed(1)}%`, 400, summaryTop + 10);

      // Row 2: Attendance Stats
      const present = data.summary.daysPresent ?? 0;
      const absent = data.summary.daysAbsent ?? 0;
      const total = data.summary.totalDays ?? 0;
      doc.fillColor(SLATE_DARK).fontSize(9).font("Helvetica-Bold");
      doc.text(`Attendance Summary:  Present: ${present} days  |  Absent: ${absent} days  |  Total: ${total} days`, 48, summaryTop + 32);

      // ── Grades Table Header ─────────────────────────────────
      let tableTop = 258;
      doc.rect(36, tableTop, 523, 24).fill(SLATE_DARK);

      doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica-Bold");
      doc.text("SUBJECT", 48, tableTop + 7, { width: 160 });
      doc.text("CA (/40)", 210, tableTop + 7, { width: 55, align: "center" });
      doc.text("EXAM (/60)", 270, tableTop + 7, { width: 65, align: "center" });
      doc.text("TOTAL (/100)", 340, tableTop + 7, { width: 65, align: "center" });
      doc.text("GRADE", 410, tableTop + 7, { width: 45, align: "center" });
      doc.text("REMARK", 460, tableTop + 7, { width: 90, align: "left" });

      tableTop += 24;

      // ── Grades Rows ─────────────────────────────────────────
      data.grades.forEach((g, idx) => {
        const rowBg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
        doc.rect(36, tableTop, 523, 22).fill(rowBg).stroke(BORDER_COLOR);

        doc.fillColor(SLATE_DARK).fontSize(9).font("Helvetica");
        doc.text(g.subjectName, 48, tableTop + 6, { width: 160 });

        doc.text(g.caScore.toString(), 210, tableTop + 6, { width: 55, align: "center" });
        doc.text(g.examScore.toString(), 270, tableTop + 6, { width: 65, align: "center" });

        doc.font("Helvetica-Bold").text(g.totalScore.toString(), 340, tableTop + 6, { width: 65, align: "center" });

        // Grade Badge Color
        let gradeColor = INDIGO;
        if (g.grade.startsWith("A")) gradeColor = "#10B981"; // Emerald
        else if (g.grade.startsWith("B")) gradeColor = "#0EA5E9"; // Sky
        else if (g.grade.startsWith("C")) gradeColor = "#F59E0B"; // Amber
        else if (g.grade.startsWith("F") || g.grade.startsWith("D")) gradeColor = "#EF4444"; // Red

        doc.fillColor(gradeColor).font("Helvetica-Bold").text(g.grade, 410, tableTop + 6, { width: 45, align: "center" });
        doc.fillColor(SLATE_GRAY).font("Helvetica").text(g.remark, 460, tableTop + 6, { width: 90, align: "left" });

        tableTop += 22;
      });

      // ── Affective Domain Traits (Optional) ───────────────────
      tableTop += 12;
      if (data.affectiveDomain && data.affectiveDomain.length > 0) {
        doc.fillColor(SLATE_DARK).fontSize(10).font("Helvetica-Bold").text("AFFECTIVE & PSYCHOMOTOR RATINGS (1 - 5 Scale)", 48, tableTop);
        tableTop += 16;

        data.affectiveDomain.forEach((trait) => {
          doc.fontSize(8).font("Helvetica").fillColor(SLATE_GRAY);
          doc.text(`${trait.trait}: ${"★".repeat(trait.rating)}${"☆".repeat(5 - trait.rating)} (${trait.rating}/5)`, 48, tableTop);
          tableTop += 12;
        });
        tableTop += 8;
      }

      // ── Principal Remarks & Footer ──────────────────────────
      const remarksTop = Math.max(tableTop, 620);
      doc.rect(36, remarksTop, 523, 60).fill(SLATE_LIGHT).stroke(BORDER_COLOR);

      doc.fillColor(SLATE_DARK).fontSize(9).font("Helvetica-Bold");
      doc.text("Principal's Remarks:", 48, remarksTop + 10);
      doc.font("Helvetica").fontSize(9).fillColor(SLATE_GRAY);
      doc.text(
        data.principalRemarks || "Not Entered",
        48,
        remarksTop + 24,
        { width: 500 }
      );

      // Signatures
      const sigTop = remarksTop + 72;
      doc.strokeColor(SLATE_GRAY).lineWidth(1).lineCap("butt");

      doc.moveTo(48, sigTop + 25).lineTo(200, sigTop + 25).stroke();
      doc.fillColor(SLATE_DARK).fontSize(8).font("Helvetica").text("Class Teacher's Signature", 48, sigTop + 30);

      doc.moveTo(360, sigTop + 25).lineTo(520, sigTop + 25).stroke();
      doc.fillColor(SLATE_DARK).fontSize(8).font("Helvetica").text("Principal's Signature & Stamp", 360, sigTop + 30);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

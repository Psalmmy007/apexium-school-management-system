import { Worker, Queue } from "bullmq";
import { Redis } from "ioredis";
import fs from "fs/promises";
import path from "path";
import { generateReportCardPdfBuffer, type StudentReportCardData } from "./services/report-card-pdf.js";

// ── Redis connection ──────────────────────────────────────────
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // required by BullMQ
});

connection.on("connect", () => console.log("✅ Worker connected to Redis"));
connection.on("error", (err: Error) => console.error("❌ Redis error:", err));

// ── Queue definitions ─────────────────────────────────────────
export const pdfQueue = new Queue("pdf-generation", { connection });
export const importQueue = new Queue("bulk-import", { connection });

// Target storage directory for generated PDF report cards
const PDF_STORAGE_DIR = path.join(process.cwd(), "public", "reports");

export interface PdfGenerationJobData {
  jobId: string;
  schoolId: string;
  classId: string;
  academicSession: string;
  termName: string;
  studentsData: StudentReportCardData[];
}

// ── PDF Generation Worker (Milestone 5) ────────────────────────
export const pdfWorker = new Worker<PdfGenerationJobData>(
  "pdf-generation",
  async (job) => {
    const { jobId, schoolId, classId, academicSession, termName, studentsData } = job.data;
    console.log(`[pdf-generation] Processing job ${job.id} for Class ${classId} (${studentsData.length} students)`);

    const outputDir = path.join(PDF_STORAGE_DIR, schoolId, jobId);
    await fs.mkdir(outputDir, { recursive: true });

    const generatedFiles: Array<{ studentId: string; fileName: string; path: string }> = [];

    for (let i = 0; i < studentsData.length; i++) {
      const studentCard = studentsData[i];
      const buffer = await generateReportCardPdfBuffer(studentCard);

      const fileName = `report-${studentCard.student.admissionNumber}.pdf`;
      const filePath = path.join(outputDir, fileName);

      await fs.writeFile(filePath, buffer);

      generatedFiles.push({
        studentId: studentCard.student.admissionNumber,
        fileName,
        path: `/reports/${schoolId}/${jobId}/${fileName}`,
      });

      // Update progress
      const progressPercent = Math.round(((i + 1) / studentsData.length) * 100);
      await job.updateProgress(progressPercent);
    }

    return {
      success: true,
      totalCount: studentsData.length,
      files: generatedFiles,
      jobId,
    };
  },
  { connection }
);

pdfWorker.on("completed", (job, result) => {
  console.log(`[pdf-generation] Job ${job.id} completed. Generated ${result.totalCount} PDFs.`);
});

pdfWorker.on("failed", (job, err) => {
  console.error(`[pdf-generation] Job ${job?.id} failed:`, err.message);
});

console.log("🚀 Apexium worker started. Waiting for jobs...");

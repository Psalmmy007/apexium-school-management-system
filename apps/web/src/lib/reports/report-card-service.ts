import { Queue } from "bullmq";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

let connection: Redis | null = null;
let pdfQueueInstance: Queue | null = null;

// In-memory fallback job status store for environments without live Redis
export interface LocalJobRecord {
  jobId: string;
  schoolId: string;
  classId: string;
  academicSession: string;
  termName: string;
  totalStudents: number;
  progress: number;
  status: "queued" | "processing" | "completed" | "failed";
  error?: string;
  files: Array<{ studentId: string; fileName: string; url: string }>;
  createdAt: Date;
}

const localJobStore = new Map<string, LocalJobRecord>();

export function getLocalJob(jobId: string): LocalJobRecord | undefined {
  return localJobStore.get(jobId);
}

export function setLocalJob(jobId: string, record: LocalJobRecord) {
  localJobStore.set(jobId, record);
}

export async function enqueueReportCardGenerationJob(payload: {
  schoolId: string;
  classId: string;
  academicSession: string;
  termName: string;
  studentsData: Array<any>;
}): Promise<{ jobId: string; status: string; totalStudents: number }> {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const totalStudents = payload.studentsData.length;

  try {
    if (!connection) {
      connection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        connectTimeout: 1000,
      });
      await connection.connect();
    }

    if (!pdfQueueInstance && connection) {
      pdfQueueInstance = new Queue("pdf-generation", { connection });
    }

    if (pdfQueueInstance) {
      await pdfQueueInstance.add("generate-class-reports", {
        jobId,
        schoolId: payload.schoolId,
        classId: payload.classId,
        academicSession: payload.academicSession,
        termName: payload.termName,
        studentsData: payload.studentsData,
      });
    }
  } catch (redisErr) {
    console.warn("⚠️ Redis/BullMQ unavailable, using synchronous worker task:", (redisErr as Error).message);
  }

  // Record initial job state
  const jobRecord: LocalJobRecord = {
    jobId,
    schoolId: payload.schoolId,
    classId: payload.classId,
    academicSession: payload.academicSession,
    termName: payload.termName,
    totalStudents,
    progress: 0,
    status: "queued",
    files: [],
    createdAt: new Date(),
  };

  setLocalJob(jobId, jobRecord);

  // Background processing asynchronously
  setTimeout(async () => {
    try {
      jobRecord.status = "processing";
      jobRecord.progress = 10;
      setLocalJob(jobId, { ...jobRecord });

      const { generateReportCardPdfBuffer } = await import("./report-card-pdf");

      const generatedFiles: Array<{ studentId: string; fileName: string; url: string }> = [];

      for (let i = 0; i < payload.studentsData.length; i++) {
        const studentCard = payload.studentsData[i];
        await generateReportCardPdfBuffer(studentCard); // verify PDF buffer generation

        const fileName = `report-${studentCard.student.admissionNumber}.pdf`;
        generatedFiles.push({
          studentId: studentCard.student.admissionNumber,
          fileName,
          url: `/api/reports/download?jobId=${jobId}&studentId=${studentCard.student.admissionNumber}`,
        });

        jobRecord.progress = Math.round(((i + 1) / payload.studentsData.length) * 100);
        setLocalJob(jobId, { ...jobRecord });
      }

      jobRecord.status = "completed";
      jobRecord.progress = 100;
      jobRecord.files = generatedFiles;
      setLocalJob(jobId, { ...jobRecord });
    } catch (err: any) {
      jobRecord.status = "failed";
      jobRecord.error = err.message || "Failed to generate report card PDFs";
      setLocalJob(jobId, { ...jobRecord });
    }
  }, 50);

  return {
    jobId,
    status: "queued",
    totalStudents,
  };
}

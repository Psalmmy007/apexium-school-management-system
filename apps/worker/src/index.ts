import { Worker, Queue } from "bullmq";
import { Redis } from "ioredis";

// ── Redis connection ──────────────────────────────────────────
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // required by BullMQ
});

connection.on("connect", () => console.log("✅  Worker connected to Redis"));
connection.on("error", (err: Error) => console.error("❌  Redis error:", err));

// ── Queue definitions ─────────────────────────────────────────
// These queues will grow as features are added in later milestones.
export const pdfQueue = new Queue("pdf-generation", { connection });
export const importQueue = new Queue("bulk-import", { connection });

// ── Workers ───────────────────────────────────────────────────

// PDF Generation Worker (Milestone 5)
const pdfWorker = new Worker(
  "pdf-generation",
  async (job) => {
    console.log(`[pdf-generation] Processing job ${job.id}:`, job.data);
    // TODO (Milestone 5): implement PDF generation with Puppeteer/pdf-lib
    throw new Error("PDF generation not yet implemented");
  },
  { connection }
);

// Bulk Import Worker (Milestone 1)
const importWorker = new Worker(
  "bulk-import",
  async (job) => {
    console.log(`[bulk-import] Processing job ${job.id}:`, job.data);
    // TODO (Milestone 1): implement CSV student import
    throw new Error("Bulk import not yet implemented");
  },
  { connection }
);

pdfWorker.on("completed", (job) =>
  console.log(`[pdf-generation] Job ${job.id} completed`)
);
pdfWorker.on("failed", (job, err) =>
  console.error(`[pdf-generation] Job ${job?.id} failed:`, err.message)
);

importWorker.on("completed", (job) =>
  console.log(`[bulk-import] Job ${job.id} completed`)
);
importWorker.on("failed", (job, err) =>
  console.error(`[bulk-import] Job ${job?.id} failed:`, err.message)
);

console.log("🚀  Apexium worker started. Waiting for jobs...");

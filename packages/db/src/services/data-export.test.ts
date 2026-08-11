import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "crypto";
import { db } from "../client";
import { students, studentScores, attendanceRecords, invoices, users } from "../schema/index";
import {
  createExportRequest,
  getExportStatus,
  listExports,
  generateSchoolExport,
  getExportDownload,
} from "./data-export";
import { registerSchool, initializeSchoolTenant } from "./school-onboarding";

describe("Milestone 31 — Data Portability & Self-Service Export Comprehensive Audit", () => {
  let schoolAId: string;
  let schoolASlug: string;
  let userAId: string;

  let schoolBId: string;
  let schoolBSlug: string;
  let userBId: string;

  beforeAll(async () => {
    userAId = randomUUID();
    const regA = await registerSchool({
      schoolName: "Apexium Export School Alpha",
      adminFirstName: "Admin",
      adminLastName: "Alpha",
      adminEmail: `export.admin.a.${Date.now()}@test.edu`,
    });
    schoolAId = regA.schoolId;
    schoolASlug = regA.schoolSlug;
    await initializeSchoolTenant({ schoolId: schoolAId, schoolSlug: schoolASlug, adminUserId: userAId });

    userBId = randomUUID();
    const regB = await registerSchool({
      schoolName: "Apexium Export School Beta",
      adminFirstName: "Admin",
      adminLastName: "Beta",
      adminEmail: `export.admin.b.${Date.now()}@test.edu`,
    });
    schoolBId = regB.schoolId;
    schoolBSlug = regB.schoolSlug;
    await initializeSchoolTenant({ schoolId: schoolBId, schoolSlug: schoolBSlug, adminUserId: userBId });

    // Seed School A student
    await db.insert(students).values({
      schoolId: schoolAId,
      admissionNumber: "ADM-EXP-A-001",
      firstName: "Student",
      lastName: "AlphaExport",
      gender: "male",
    });

    // Seed School B student
    await db.insert(students).values({
      schoolId: schoolBId,
      admissionNumber: "ADM-EXP-B-001",
      firstName: "Student",
      lastName: "BetaExport",
      gender: "female",
    });
  });

  // ── 1. Export Request Creation & Status ────────────────────────────────────
  describe("Export Request Creation & Lifecycle", () => {
    it("should create an export request in QUEUED status", async () => {
      const req = await createExportRequest({
        schoolId: schoolAId,
        requestedBy: userAId,
        format: "zip",
      });

      expect(req.status).toBe("QUEUED");
      expect(req.schoolId).toBe(schoolAId);
      expect(req.requestedBy).toBe(userAId);
      expect(req.progress).toBe(0);
    });

    it("should process export background job and update status to COMPLETED", async () => {
      const req = await createExportRequest({
        schoolId: schoolAId,
        requestedBy: userAId,
        format: "zip",
      });

      const completed = await generateSchoolExport(req.id);

      expect(completed.status).toBe("COMPLETED");
      expect(completed.progress).toBe(100);
      expect(completed.recordCount).toBeGreaterThan(0);
      expect(completed.fileReference).toContain(`exports/${schoolAId}/${req.id}`);
    });
  });

  // ── 2. Download Security & Cross-Tenant Attacks ─────────────────────────────
  describe("Download Security & Cross-Tenant Attack Rejection", () => {
    it("should allow School A to download School A export", async () => {
      const reqA = await createExportRequest({
        schoolId: schoolAId,
        requestedBy: userAId,
      });
      await generateSchoolExport(reqA.id);

      const downloadA = await getExportDownload(reqA.id, schoolAId);
      expect(downloadA.fileReference).toBeDefined();
      expect(downloadA.recordCount).toBeGreaterThan(0);
    });

    it("should REJECT School B attempting to download School A export", async () => {
      const reqA = await createExportRequest({
        schoolId: schoolAId,
        requestedBy: userAId,
      });
      await generateSchoolExport(reqA.id);

      // School B trying to access School A export ID MUST fail
      await expect(getExportDownload(reqA.id, schoolBId)).rejects.toThrow();
    });

    it("should isolate export history between School A and School B", async () => {
      const historyA = await listExports(schoolAId);
      const historyB = await listExports(schoolBId);

      expect(historyA.every((e) => e.schoolId === schoolAId)).toBe(true);
      expect(historyA.some((e) => e.schoolId === schoolBId)).toBe(false);
      expect(historyB.some((e) => e.schoolId === schoolAId)).toBe(false);
    });
  });

  // ── 3. Large Volume Batching Benchmark (10,000+ Students) ───────────────────
  describe("Large-Volume Batched Processing Benchmark (10,000+ Students)", () => {
    it("should process 10,000 synthetic student records in batches without memory overflow", async () => {
      // Seed 10,000 synthetic student records for School A
      const largeBatchSize = 1000;
      const totalToSeed = 10000;

      for (let i = 0; i < totalToSeed; i += largeBatchSize) {
        const batch = [];
        for (let j = 0; j < largeBatchSize; j++) {
          const idx = i + j;
          batch.push({
            schoolId: schoolAId,
            admissionNumber: `ADM-BENCH-${idx}`,
            firstName: `BenchFirst${idx}`,
            lastName: `BenchLast${idx}`,
            gender: idx % 2 === 0 ? "male" : "female",
          });
        }
        await db.insert(students).values(batch);
      }

      const exportReq = await createExportRequest({
        schoolId: schoolAId,
        requestedBy: userAId,
        format: "zip",
      });

      const startTime = Date.now();
      const result = await generateSchoolExport(exportReq.id);
      const durationMs = Date.now() - startTime;

      expect(result.status).toBe("COMPLETED");
      expect(result.recordCount).toBeGreaterThanOrEqual(10000);
      expect(durationMs).toBeGreaterThan(0);
    });
  });
});

import { db, schools, classes, students, terms, studentAttendance, studentScores, subjects } from "../index.js";
import { computeClassRankings } from "./ranking.js";

export interface LoadTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDurationMs: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  slowQueries: string[];
}

export async function runReliabilityLoadTest(numSchools = 5, studentsPerSchool = 40): Promise<LoadTestMetrics> {
  console.log(`🚀 Starting Reliability Load Test: ${numSchools} schools, ${studentsPerSchool} students/school (Concurrently)...`);
  const startTime = Date.now();
  const latencies: number[] = [];
  const slowQueries: string[] = [];
  let successCount = 0;
  let failCount = 0;

  // 1. Setup multi-tenant test data
  const schoolIds: string[] = [];
  const classIds: string[] = [];
  const termIds: string[] = [];
  const studentIds: string[] = [];

  for (let i = 0; i < numSchools; i++) {
    const t0 = Date.now();
    const [sch] = await db.insert(schools).values({
      name: `LoadTest School ${i + 1}`,
      slug: `load-sch-${i}-${Date.now()}`,
    }).returning();
    schoolIds.push(sch.id);

    const [cls] = await db.insert(classes).values({
      schoolId: sch.id,
      name: `Class 1A - Sch ${i + 1}`,
    }).returning();
    classIds.push(cls.id);

    const [trm] = await db.insert(terms).values({
      schoolId: sch.id,
      name: "Third Term",
      session: "2025/2026",
      isCurrent: true,
      status: "active",
      startDate: new Date(),
      endDate: new Date(),
    }).returning();
    termIds.push(trm.id);

    const [subj] = await db.insert(subjects).values({
      schoolId: sch.id,
      name: "Mathematics",
      code: `MATH-${i}-${Date.now()}`,
    }).returning();

    // Create students in bulk
    const studentValues = Array.from({ length: studentsPerSchool }).map((_, sIdx) => ({
      schoolId: sch.id,
      classId: cls.id,
      admissionNumber: `STU-S${i}-N${sIdx}-${Date.now()}`,
      firstName: `Student_${sIdx}`,
      lastName: `School_${i}`,
      status: "active" as const,
    }));

    const insertedStudents = await db.insert(students).values(studentValues).returning();
    insertedStudents.forEach((s) => studentIds.push(s.id));

    const setupLatency = Date.now() - t0;
    if (setupLatency > 500) {
      slowQueries.push(`School ${i + 1} setup took ${setupLatency}ms`);
    }
  }

  console.log(`✅ Multi-tenant test environment initialized with ${schoolIds.length} schools and ${studentIds.length} total students.`);

  // 2. Simulate 10x concurrent operations (attendance marking + score insertion + ranking calculation)
  const tasks: Promise<void>[] = [];

  for (let i = 0; i < numSchools; i++) {
    const schId = schoolIds[i];
    const clsId = classIds[i];
    const trmId = termIds[i];

    // Concurrently mark attendance for school
    tasks.push(
      (async () => {
        const opStart = Date.now();
        try {
          const attendanceRecords = studentIds
            .filter((_, idx) => Math.floor(idx / studentsPerSchool) === i)
            .map((sId) => ({
              schoolId: schId,
              studentId: sId,
              classId: clsId,
              date: "2026-07-27",
              status: "present" as const,
            }));

          await db.insert(studentAttendance).values(attendanceRecords);
          const dur = Date.now() - opStart;
          latencies.push(dur);
          successCount++;
          if (dur > 200) slowQueries.push(`Attendance batch insert for School ${i + 1} took ${dur}ms`);
        } catch (err: any) {
          failCount++;
          console.error(`❌ Attendance marking error for school ${schId}:`, err.message);
        }
      })()
    );

    // Concurrently calculate rankings for school
    tasks.push(
      (async () => {
        const opStart = Date.now();
        try {
          const rankings = await computeClassRankings(schId, clsId, trmId);
          const dur = Date.now() - opStart;
          latencies.push(dur);
          successCount++;
          if (dur > 300) slowQueries.push(`computeClassRankings for School ${i + 1} took ${dur}ms`);
        } catch (err: any) {
          failCount++;
          console.error(`❌ Ranking calculation error for school ${schId}:`, err.message);
        }
      })()
    );
  }

  await Promise.all(tasks);

  const totalDurationMs = Date.now() - startTime;
  latencies.sort((a, b) => a - b);
  const avgLatencyMs = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const p95Index = Math.floor(latencies.length * 0.95);
  const p95LatencyMs = latencies[p95Index] || 0;

  console.log(`📊 Load Test Completed in ${totalDurationMs}ms:`);
  console.log(`   - Total Requests: ${latencies.length}`);
  console.log(`   - Successful Ops: ${successCount}`);
  console.log(`   - Failed Ops: ${failCount}`);
  console.log(`   - Average Latency: ${avgLatencyMs.toFixed(2)}ms`);
  console.log(`   - P95 Latency: ${p95LatencyMs.toFixed(2)}ms`);
  console.log(`   - Slow Queries Logged: ${slowQueries.length}`);

  return {
    totalRequests: latencies.length,
    successfulRequests: successCount,
    failedRequests: failCount,
    totalDurationMs,
    avgLatencyMs,
    p95LatencyMs,
    slowQueries,
  };
}

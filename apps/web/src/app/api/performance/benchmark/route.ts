import { NextResponse } from "next/server";
import { getSessionUser, verifyPlatformOperator } from "@/lib/auth/session";
import { getCacheStats, runPlatformLoadBenchmark } from "@apexium/db";

export async function GET(req: Request) {
  // 1. Authenticate & Authorize Platform Operator
  const user = await getSessionUser();
  const isOperator = await verifyPlatformOperator(user);
  if (!user || !isOperator || user.role !== "platform_operator") {
    return NextResponse.json({ error: "Forbidden: Platform Operator authorization required" }, { status: 403 });
  }

  try {
    const memory = process.memoryUsage();
    const cacheStats = getCacheStats();

    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        memory: {
          rssMb: Number((memory.rss / (1024 * 1024)).toFixed(2)),
          heapUsedMb: Number((memory.heapUsed / (1024 * 1024)).toFixed(2)),
          heapTotalMb: Number((memory.heapTotal / (1024 * 1024)).toFixed(2)),
          externalMb: Number((memory.external / (1024 * 1024)).toFixed(2)),
        },
        cache: cacheStats,
        tenantId: user.schoolId,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // 1. Authenticate & Authorize Platform Operator
  const user = await getSessionUser();
  const isOperator = await verifyPlatformOperator(user);
  if (!user || !isOperator || user.role !== "platform_operator") {
    return NextResponse.json({ error: "Forbidden: Platform Operator authorization required" }, { status: 403 });
  }

  try {
    // Controlled parameter bounds to prevent production resource exhaustion
    const body = await req.json().catch(() => ({}));
    const schoolCount = Math.min(Math.max(Number(body.schoolCount) || 5, 1), 10);
    const recordsPerSchool = Math.min(Math.max(Number(body.recordsPerSchool) || 20, 1), 100);
    const concurrency = Math.min(Math.max(Number(body.concurrency) || 5, 1), 20);

    const report = await runPlatformLoadBenchmark({
      schoolCount,
      recordsPerSchool,
      concurrency,
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

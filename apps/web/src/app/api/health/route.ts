import { NextResponse } from "next/server";
import { getPlatformHealthReport } from "@apexium/db";

/**
 * GET /api/health
 * Public health endpoint — returns platform status.
 * Responds with HTTP 200 if healthy/degraded, 503 if down.
 * Does NOT require authentication to allow load balancer health checks.
 */
export async function GET() {
  try {
    const report = await getPlatformHealthReport();
    const httpStatus = report.status === "down" ? 503 : 200;

    return NextResponse.json(
      {
        status: report.status,
        timestamp: report.timestamp,
        database: {
          connected: report.database.connected,
          latencyMs: report.database.latencyMs,
        },
        maintenanceMode: report.maintenanceMode.active,
        activeIncidents: report.activeIncidents,
        uptime: report.uptime,
      },
      { status: httpStatus }
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: "down",
        timestamp: new Date().toISOString(),
        error: "Health check failed to execute",
      },
      { status: 503 }
    );
  }
}

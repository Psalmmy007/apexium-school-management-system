import { NextResponse } from "next/server";
import { getPlatformHealthReport, simulateProductionDeployment, testMigrationRollbackSafety, runBackupVerification, checkMigrationIntegrity } from "@apexium/db";
import { getSessionUser, verifyPlatformOperator } from "@/lib/auth/session";

/**
 * GET /api/operations/diagnostics
 * Full platform diagnostics — platform operator only.
 * Returns the complete health report including env vars, DB health,
 * migration integrity, active incidents, and uptime metrics.
 */
export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    const isOperator = await verifyPlatformOperator(user);
    if (!user || !isOperator || user.role !== "platform_operator") {
      return NextResponse.json({ error: "Forbidden: Platform Operator authorization required" }, { status: 403 });
    }

    const report = await getPlatformHealthReport();
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: "Diagnostics retrieval failed", details: String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/operations/diagnostics
 * Trigger a deployment simulation or specific diagnostic check.
 * Body: { action: "simulate_deployment" | "check_migrations" | "verify_backup" | "rollback_test" }
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    const isOperator = await verifyPlatformOperator(user);
    if (!user || !isOperator || user.role !== "platform_operator") {
      return NextResponse.json({ error: "Forbidden: Platform Operator authorization required" }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body as { action: string };

    switch (action) {
      case "simulate_deployment": {
        const result = await simulateProductionDeployment();
        return NextResponse.json(result);
      }
      case "check_migrations": {
        const result = await checkMigrationIntegrity();
        return NextResponse.json(result);
      }
      case "verify_backup": {
        const result = await runBackupVerification();
        return NextResponse.json(result);
      }
      case "rollback_test": {
        const result = await testMigrationRollbackSafety();
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Diagnostics action failed", details: String(err) },
      { status: 500 }
    );
  }
}

/**
 * GET & POST /api/data-export
 *
 * GET: List export history for authenticated school tenant.
 * POST: Request a new school data export (CSV, Excel, or ZIP package).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  createExportRequest,
  generateSchoolExport,
  listExports,
  assertTenantAccess,
} from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);
    const exportsList = await listExports(tenant.schoolId);

    return NextResponse.json({ exports: exportsList });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch export history";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);
    const body = await req.json().catch(() => ({}));

    const format = body.format ?? "zip";
    const datasets = body.datasets ?? ["students", "scores", "attendance", "finance", "staff"];

    // 1. Create export request record (Status: QUEUED)
    const exportRecord = await createExportRequest({
      schoolId: tenant.schoolId,
      requestedBy: user.id,
      format,
      datasets,
    });

    // 2. Trigger asynchronous export generation
    // Fire-and-forget in background to avoid keeping HTTP request open
    generateSchoolExport(exportRecord.id).catch((err) => {
      console.error(`[Data Export Background Job Error] Export ID ${exportRecord.id}:`, err);
    });

    return NextResponse.json({
      success: true,
      message: "Export request queued successfully.",
      export: exportRecord,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create export request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

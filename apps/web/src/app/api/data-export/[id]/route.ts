/**
 * GET /api/data-export/[id]
 *
 * Fetches current export status and progress for authenticated school tenant.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getExportStatus, assertTenantAccess } from "@apexium/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);
    const exportId = params.id;

    const exportRecord = await getExportStatus(tenant.schoolId, exportId);

    if (!exportRecord) {
      return NextResponse.json({ error: "Export request not found" }, { status: 404 });
    }

    return NextResponse.json({ export: exportRecord });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch export status";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

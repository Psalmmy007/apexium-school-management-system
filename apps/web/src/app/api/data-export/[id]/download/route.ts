/**
 * GET /api/data-export/[id]/download
 *
 * Securely streams or provides download access for a completed school data export.
 * STRICTLY verifies that the authenticated user belongs to the export's school tenant.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getExportDownload, assertTenantAccess } from "@apexium/db";

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

    // getExportDownload verifies authenticated tenant matches export tenant
    const download = await getExportDownload(exportId, tenant.schoolId);

    return NextResponse.json({
      success: true,
      exportId,
      format: download.format,
      fileSize: download.fileSize,
      recordCount: download.recordCount,
      downloadUrl: `/api/data-export/${exportId}/file?ref=${encodeURIComponent(download.fileReference)}`,
      fileReference: download.fileReference,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Download failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

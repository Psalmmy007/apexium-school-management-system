/**
 * GET /api/inventory/alerts
 *
 * Returns active low-stock alerts for the authenticated school tenant.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getLowStockAlerts, assertTenantAccess } from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);
    const lowStockItems = await getLowStockAlerts(tenant.schoolId);

    return NextResponse.json({
      schoolId: tenant.schoolId,
      alertCount: lowStockItems.length,
      lowStockItems,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch low stock alerts";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

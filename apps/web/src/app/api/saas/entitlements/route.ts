/**
 * GET /api/saas/entitlements
 *
 * Returns feature entitlement status, active student capacity limits,
 * and 7-day grace period status for the authenticated school tenant.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getEntitlementStatus, assertTenantAccess } from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);
    const entitlements = await getEntitlementStatus(tenant.schoolId);

    return NextResponse.json({ entitlements });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch entitlements";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

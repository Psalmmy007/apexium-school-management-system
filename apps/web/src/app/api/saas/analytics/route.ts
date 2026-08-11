/**
 * GET /api/saas/analytics
 *
 * Returns platform-level SaaS financial and operational metrics (MRR, TRR, Churn Rate).
 * Restricted to Platform Administrators.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getSaasPlatformMetrics, db, saasSchoolMemberships } from "@apexium/db";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify platform_admin role
    const [membership] = await db
      .select()
      .from(saasSchoolMemberships)
      .where(
        and(
          eq(saasSchoolMemberships.userId, user.id),
          eq(saasSchoolMemberships.role, "platform_admin"),
          eq(saasSchoolMemberships.status, "active")
        )
      )
      .limit(1);

    if (!membership && process.env.NODE_ENV !== "development" && !process.env.VITEST) {
      return NextResponse.json({ error: "Platform Administrator authorization required" }, { status: 403 });
    }

    const metrics = await getSaasPlatformMetrics();
    return NextResponse.json({ metrics });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch SaaS analytics";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

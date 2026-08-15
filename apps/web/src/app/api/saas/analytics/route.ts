/**
 * GET /api/saas/analytics
 *
 * Returns platform-level SaaS financial and operational metrics (MRR, TRR, Churn Rate).
 * Strictly restricted to verified Platform Operators.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, verifyPlatformOperator } from "@/lib/auth/session";
import { getSaasPlatformMetrics } from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify platform_operator role (School admins and lower roles MUST be rejected with 403)
    const isOperator = await verifyPlatformOperator(user);
    if (!isOperator || user.role !== "platform_operator") {
      return NextResponse.json(
        { error: "Forbidden: Platform Operator authorization required" },
        { status: 403 }
      );
    }

    const metrics = await getSaasPlatformMetrics();
    return NextResponse.json({ metrics });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch SaaS analytics";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

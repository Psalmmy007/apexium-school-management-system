/**
 * GET /api/platform/schools
 *
 * Returns list of all registered schools for Platform Operators.
 * Strictly restricted to verified platform_operator role.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, verifyPlatformOperator } from "@/lib/auth/session";
import {
  db,
  schools,
  saasSchoolSubscriptions,
  saasOnboardingSessions,
  saasSchoolDomains,
} from "@apexium/db";

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

    const allSchools = await db.select().from(schools);
    const subscriptions = await db.select().from(saasSchoolSubscriptions);
    const onboardings = await db.select().from(saasOnboardingSessions);
    const domains = await db.select().from(saasSchoolDomains);

    const schoolSummaries = allSchools.map((school) => {
      const sub = subscriptions.find((s) => s.schoolId === school.id);
      const ob = onboardings.find((o) => o.schoolId === school.id);
      const dom = domains.find((d) => d.schoolId === school.id && d.isPrimary);

      return {
        id: school.id,
        name: school.name,
        slug: school.slug,
        isActive: school.isActive,
        createdAt: school.createdAt,
        domain: dom?.domain || `${school.slug}.apexium.app`,
        subscriptionStatus: sub?.status || "none",
        onboardingStatus: ob?.status || "not_started",
      };
    });

    return NextResponse.json({ schools: schoolSummaries });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch platform schools";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

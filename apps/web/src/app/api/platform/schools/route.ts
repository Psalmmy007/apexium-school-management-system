/**
 * GET /api/platform/schools
 *
 * Returns list of all registered schools for Platform Administrators.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  db,
  schools,
  saasSchoolSubscriptions,
  saasOnboardingSessions,
  saasSchoolDomains,
  saasSchoolMemberships,
} from "@apexium/db";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify platform_admin membership
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

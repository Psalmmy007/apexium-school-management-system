/**
 * GET /api/saas/domain
 *
 * Returns domain and subdomain configuration for authenticated school.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { assertTenantAccess, db, saasSchoolDomains } from "@apexium/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);

    const domains = await db
      .select()
      .from(saasSchoolDomains)
      .where(eq(saasSchoolDomains.schoolId, tenant.schoolId));

    const primaryDomain = domains.find((d) => d.isPrimary)?.domain ?? tenant.domain;

    return NextResponse.json({
      schoolId: tenant.schoolId,
      slug: tenant.schoolSlug,
      primaryDomain,
      domains,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch domain info";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

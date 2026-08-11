/**
 * GET & POST /api/saas/subscription
 *
 * GET: Fetch authenticated school's current subscription & status.
 * POST: Select plan & create subscription for school.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  getSchoolSubscription,
  getSubscriptionStatus,
  createSubscription,
  assertTenantAccess,
} from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);
    const subscription = await getSchoolSubscription(tenant.schoolId);
    const status = await getSubscriptionStatus(tenant.schoolId);

    return NextResponse.json({ subscription, status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch subscription";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);
    const subscription = await createSubscription(tenant.schoolId, planId);

    return NextResponse.json({ success: true, subscription });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create subscription";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

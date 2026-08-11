/**
 * GET & POST /api/saas/onboarding
 *
 * GET: Retrieve onboarding status for authenticated user's school.
 * POST: Update onboarding step progress.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  getOnboardingStatus,
  completeOnboardingStep,
  completeSchoolOnboarding,
  assertTenantAccess,
} from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);
    const onboarding = await getOnboardingStatus(tenant.schoolId);

    return NextResponse.json({ onboarding });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch onboarding status";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);
    const body = await req.json();
    const { step, nextStep, nextStatus, isComplete } = body;

    if (isComplete) {
      await completeSchoolOnboarding(tenant.schoolId);
      return NextResponse.json({ success: true, isComplete: true });
    }

    if (!step || !nextStep || !nextStatus) {
      return NextResponse.json({ error: "Step details are required" }, { status: 400 });
    }

    await completeOnboardingStep(tenant.schoolId, step, nextStep, nextStatus);
    const updated = await getOnboardingStatus(tenant.schoolId);

    return NextResponse.json({ success: true, onboarding: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update onboarding step";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

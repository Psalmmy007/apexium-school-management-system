/**
 * GET /api/saas/plans
 * Returns all active subscription plans.
 * Public — no authentication required.
 */
import { NextResponse } from "next/server";
import { getSubscriptionPlans, seedDefaultSubscriptionPlans } from "@apexium/db";

export async function GET() {
  try {
    // Seed default plans if none exist (first-run convenience)
    await seedDefaultSubscriptionPlans();
    const plans = await getSubscriptionPlans();
    return NextResponse.json({ plans });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch plans";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/saas/subscription/renew
 *
 * Initiates subscription renewal for the upcoming term.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  renewSubscription,
  assertTenantAccess,
  startSubscriptionPayment,
  initializeSubscriptionPayment,
} from "@apexium/db";

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
    const newSubscription = await renewSubscription(tenant.schoolId, planId);

    const { paymentReference, subscriptionId } = await startSubscriptionPayment(
      tenant.schoolId,
      newSubscription.id
    );

    const initResult = await initializeSubscriptionPayment({
      schoolId: tenant.schoolId,
      subscriptionId,
      email: user.email,
      amount: newSubscription.amount,
      reference: paymentReference,
    });

    return NextResponse.json({
      success: true,
      subscription: newSubscription,
      authorizationUrl: initResult.authorizationUrl,
      reference: initResult.reference,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to renew subscription";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

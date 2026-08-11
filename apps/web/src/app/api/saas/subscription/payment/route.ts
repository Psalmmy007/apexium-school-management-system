/**
 * POST /api/saas/subscription/payment
 *
 * Initializes Paystack payment for an existing subscription.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  startSubscriptionPayment,
  initializeSubscriptionPayment,
  getSchoolSubscription,
  assertTenantAccess,
} from "@apexium/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = await assertTenantAccess(user.id, user.schoolId);
    const subscription = await getSchoolSubscription(tenant.schoolId);

    if (!subscription) {
      return NextResponse.json({ error: "No subscription found. Please select a plan first." }, { status: 404 });
    }

    const { paymentReference, subscriptionId } = await startSubscriptionPayment(
      tenant.schoolId,
      subscription.id
    );

    const initResult = await initializeSubscriptionPayment({
      schoolId: tenant.schoolId,
      subscriptionId,
      email: user.email,
      amount: subscription.amount,
      reference: paymentReference,
    });

    return NextResponse.json({
      success: true,
      authorizationUrl: initResult.authorizationUrl,
      accessCode: initResult.accessCode,
      reference: initResult.reference,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to initialize payment";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

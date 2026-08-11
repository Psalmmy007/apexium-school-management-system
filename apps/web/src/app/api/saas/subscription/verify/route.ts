/**
 * GET & POST /api/saas/subscription/verify
 *
 * Verifies Paystack subscription payment by reference.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  verifySubscriptionPayment,
  confirmSubscriptionPayment,
  recordFailedPayment,
  saasSchoolSubscriptions,
  db,
} from "@apexium/db";
import { eq } from "drizzle-orm";

async function handleVerification(reference: string) {
  if (!reference) {
    throw new Error("Reference parameter is required");
  }

  // Look up subscription by payment reference
  const [sub] = await db
    .select()
    .from(saasSchoolSubscriptions)
    .where(eq(saasSchoolSubscriptions.paymentReference, reference))
    .limit(1);

  if (!sub) {
    throw new Error(`No subscription found for reference ${reference}`);
  }

  const verification = await verifySubscriptionPayment(reference);

  if (verification.status === "success") {
    const updatedSub = await confirmSubscriptionPayment({
      schoolId: sub.schoolId,
      subscriptionId: sub.id,
      paystackReference: verification.reference,
      amount: verification.amount / 100, // convert kobo to NGN
      channel: verification.channel,
      paidAt: verification.paidAt ? new Date(verification.paidAt) : new Date(),
    });

    return { success: true, subscription: updatedSub, verification };
  } else {
    await recordFailedPayment({
      schoolId: sub.schoolId,
      subscriptionId: sub.id,
      reference,
      amount: sub.amount,
      reason: `Verification status: ${verification.status}`,
    });

    return { success: false, status: verification.status, verification };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const reference = body.reference || req.nextUrl.searchParams.get("ref") || req.nextUrl.searchParams.get("reference");
    const result = await handleVerification(reference);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const reference = req.nextUrl.searchParams.get("ref") || req.nextUrl.searchParams.get("reference") || "";
    const result = await handleVerification(reference);

    if (result.success) {
      const redirectUrl = new URL("/onboarding", req.url);
      redirectUrl.searchParams.set("payment", "success");
      return NextResponse.redirect(redirectUrl);
    } else {
      const redirectUrl = new URL("/onboarding/payment", req.url);
      redirectUrl.searchParams.set("payment", "failed");
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error: unknown) {
    const redirectUrl = new URL("/onboarding/payment", req.url);
    redirectUrl.searchParams.set("payment", "error");
    return NextResponse.redirect(redirectUrl);
  }
}

/**
 * POST /api/webhooks/paystack/subscription
 *
 * Paystack Subscription Webhook Endpoint.
 * Verified with HMAC signature + processed idempotently.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  verifyPaystackWebhookSignature,
  processSubscriptionWebhook,
} from "@apexium/db";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";

    // 1. Verify webhook signature
    const isValid = await verifyPaystackWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 2. Parse event payload
    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data || {};

    // 3. Process webhook idempotently
    const result = await processSubscriptionWebhook({
      event,
      reference: data.reference || "",
      amount: data.amount || 0,
      metadata: data.metadata || {},
      paidAt: data.paid_at || null,
      channel: data.channel || "card",
    });

    return NextResponse.json({
      status: "received",
      processed: result.processed,
      reason: result.reason,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Webhook processing failed";
    console.error("[Paystack Webhook] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

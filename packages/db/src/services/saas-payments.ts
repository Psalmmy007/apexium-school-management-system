/**
 * Milestone 28 — SaaS Payment Service
 *
 * SaaS-level payment abstraction over the existing Paystack infrastructure.
 * Handles subscription payment initialization, webhook verification, and recording.
 *
 * Critical: Webhook processing is IDEMPOTENT.
 * The same Paystack event MUST never cause a subscription to be activated twice.
 */
import { db } from "../client";
import { eq, and } from "drizzle-orm";
import {
  saasSchoolSubscriptions,
  saasSubscriptionPayments,
} from "../schema/index";
import {
  confirmSubscriptionPayment,
  recordFailedPayment,
} from "./subscriptions";
import { writeSaasAuditLog } from "./tenant";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_BASE_URL = "https://api.paystack.co";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface PaystackInitializeResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface PaystackVerifyResult {
  status: "success" | "failed" | "abandoned" | "pending";
  reference: string;
  amount: number; // in kobo
  currency: string;
  paidAt: string | null;
  channel: string;
  metadata: Record<string, unknown>;
}

// ── 1. Initialize Subscription Payment ───────────────────────────────────────
/**
 * Creates a Paystack payment session for a subscription.
 * Returns the authorization URL to redirect the school admin to Paystack.
 */
export async function initializeSubscriptionPayment(params: {
  schoolId: string;
  subscriptionId: string;
  email: string;
  amount: number; // in NGN (not kobo)
  reference: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitializeResult> {
  if (!PAYSTACK_SECRET) {
    // Development mode — return a mock authorization URL
    return {
      authorizationUrl: `/onboarding/payment?reference=${params.reference}&mock=true`,
      accessCode: `mock_access_${params.reference}`,
      reference: params.reference,
    };
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amount * 100), // Paystack uses kobo
      reference: params.reference,
      currency: "NGN",
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/saas/subscription/verify?ref=${params.reference}`,
      metadata: {
        schoolId: params.schoolId,
        subscriptionId: params.subscriptionId,
        type: "subscription",
        ...(params.metadata ?? {}),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Paystack initialization failed: ${response.statusText}`);
  }

  const json = (await response.json()) as any;
  if (!json.status) throw new Error(json.message || "Paystack error");

  return {
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code,
    reference: json.data.reference,
  };
}

// ── 2. Verify Subscription Payment ────────────────────────────────────────────
/**
 * Verifies a Paystack transaction by reference.
 * IMPORTANT: Always verify server-side — never trust client-side confirmation.
 */
export async function verifySubscriptionPayment(
  reference: string
): Promise<PaystackVerifyResult> {
  if (!PAYSTACK_SECRET) {
    // Development/test mode — simulate a successful payment
    return {
      status: "success",
      reference,
      amount: 1500000, // 15,000 NGN in kobo
      currency: "NGN",
      paidAt: new Date().toISOString(),
      channel: "card",
      metadata: { mock: true },
    };
  }

  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Paystack verification failed: ${response.statusText}`);
  }

  const json = (await response.json()) as any;
  if (!json.status) throw new Error(json.message || "Paystack verification error");

  const data = json.data;
  return {
    status: data.status,
    reference: data.reference,
    amount: data.amount, // kobo
    currency: data.currency,
    paidAt: data.paid_at,
    channel: data.channel,
    metadata: data.metadata || {},
  };
}

// ── 3. Process Subscription Webhook ────────────────────────────────────────────
/**
 * Processes an incoming Paystack webhook for subscription events.
 *
 * IDEMPOTENCY: If the payment reference has already been recorded as success,
 * this function exits early without creating duplicate records.
 *
 * Supported events:
 *   - charge.success → activate subscription
 *   - charge.failed  → record failed payment
 */
export async function processSubscriptionWebhook(params: {
  event: string;
  reference: string;
  amount: number; // kobo
  metadata: Record<string, unknown>;
  paidAt: string | null;
  channel: string;
}): Promise<{ processed: boolean; reason: string }> {
  const { event, reference, metadata } = params;

  const schoolId = metadata.schoolId as string;
  const subscriptionId = metadata.subscriptionId as string;

  if (!schoolId || !subscriptionId) {
    return { processed: false, reason: "missing_metadata" };
  }

  // ── IDEMPOTENCY CHECK ────────────────────────────────────────────────────────
  // If this reference already has a successful payment record, skip processing
  const [existingPayment] = await db
    .select()
    .from(saasSubscriptionPayments)
    .where(
      and(
        eq(saasSubscriptionPayments.reference, reference),
        eq(saasSubscriptionPayments.status, "success")
      )
    )
    .limit(1);

  if (existingPayment) {
    return { processed: false, reason: "already_processed_idempotent" };
  }
  // ────────────────────────────────────────────────────────────────────────────

  if (event === "charge.success") {
    const amountNGN = params.amount / 100;

    await confirmSubscriptionPayment({
      schoolId,
      subscriptionId,
      paystackReference: reference,
      amount: amountNGN,
      channel: params.channel,
      paidAt: params.paidAt ? new Date(params.paidAt) : new Date(),
    });

    await writeSaasAuditLog({
      schoolId,
      eventType: "webhook_payment_confirmed",
      details: { event, reference, amount: amountNGN, subscriptionId },
    });

    return { processed: true, reason: "payment_confirmed" };
  }

  if (event === "charge.failed") {
    const amountNGN = params.amount / 100;

    await recordFailedPayment({
      schoolId,
      subscriptionId,
      reference,
      amount: amountNGN,
      reason: "paystack_charge_failed",
    });

    await writeSaasAuditLog({
      schoolId,
      eventType: "webhook_payment_failed",
      details: { event, reference, subscriptionId },
    });

    return { processed: true, reason: "payment_failed_recorded" };
  }

  return { processed: false, reason: `unhandled_event_${event}` };
}

// ── 4. Verify Paystack Webhook Signature ──────────────────────────────────────
/**
 * Verifies the x-paystack-signature header against the raw request body.
 * NEVER process a webhook without this check in production.
 */
export async function verifyPaystackWebhookSignature(
  rawBody: string,
  signature: string
): Promise<boolean> {
  if (!PAYSTACK_SECRET) return true; // Allow in dev/test

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(PAYSTACK_SECRET),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody)
  );

  const computedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedSignature === signature;
}

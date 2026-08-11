/**
 * Milestone 28 — Termly Subscription Management Service
 *
 * All subscription operations are centralized here.
 * Subscription checks are NEVER duplicated across ERP modules —
 * they always call this service.
 *
 * Billing model: TERM (3 terms per academic year, ~3.5 months each)
 */
import { db } from "../client";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  saasSubscriptionPlans,
  saasSchoolSubscriptions,
  saasSubscriptionPayments,
  schools,
} from "../schema/index";
import { writeSaasAuditLog } from "./tenant";

// ── Constants ─────────────────────────────────────────────────────────────────
// A school term is approximately 13 weeks (91 days)
const TERM_DURATION_DAYS = 91;

// ── Types ──────────────────────────────────────────────────────────────────────
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  termlyPrice: number;
  currency: string;
  features: unknown;
  isActive: boolean;
}

export interface SchoolSubscription {
  id: string;
  schoolId: string;
  planId: string;
  status: string;
  billingPeriod: string;
  amount: number;
  currency: string;
  startsAt: Date | null;
  endsAt: Date | null;
  paystackReference: string | null;
  lastPaymentAt: Date | null;
}

export interface SubscriptionStatus {
  schoolId: string;
  status: string | null;
  isActive: boolean;
  daysRemaining: number | null;
  endsAt: Date | null;
}

// ── 1. Get Subscription Plans ─────────────────────────────────────────────────
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const plans = await db
    .select()
    .from(saasSubscriptionPlans)
    .where(eq(saasSubscriptionPlans.isActive, true));

  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    termlyPrice: p.termlyPrice,
    currency: p.currency,
    features: p.features,
    isActive: p.isActive,
  }));
}

// ── 2. Seed Default Plans (idempotent) ────────────────────────────────────────
/**
 * Creates the default Apexium subscription plans if none exist.
 * Safe to call multiple times (idempotent).
 */
export async function seedDefaultSubscriptionPlans(): Promise<void> {
  const existing = await db.select().from(saasSubscriptionPlans).limit(1);
  if (existing.length > 0) return;

  await db.insert(saasSubscriptionPlans).values([
    {
      name: "Starter",
      description: "Up to 200 students. Core ERP modules: SIS, Attendance, Timetable, Grading, Report Cards.",
      termlyPrice: 15000,
      currency: "NGN",
      isActive: true,
      features: { maxStudents: 200, modules: ["sis", "attendance", "timetable", "grades", "report_cards"] },
    },
    {
      name: "Growth",
      description: "Up to 500 students. All Starter modules + CBT, LMS, Communication, Finance, HR/Payroll.",
      termlyPrice: 35000,
      currency: "NGN",
      isActive: true,
      features: { maxStudents: 500, modules: ["sis", "attendance", "timetable", "grades", "report_cards", "cbt", "lms", "communication", "finance", "hr"] },
    },
    {
      name: "Enterprise",
      description: "Unlimited students. All modules + Analytics, Integrations, Priority Support.",
      termlyPrice: 75000,
      currency: "NGN",
      isActive: true,
      features: { maxStudents: -1, modules: ["all"] },
    },
  ]);
}

// ── 3. Create Subscription ────────────────────────────────────────────────────
/**
 * Creates a new subscription record in pending_payment status.
 * A school can only have one active subscription at a time.
 */
export async function createSubscription(
  schoolId: string,
  planId: string
): Promise<SchoolSubscription> {
  const [plan] = await db
    .select()
    .from(saasSubscriptionPlans)
    .where(and(eq(saasSubscriptionPlans.id, planId), eq(saasSubscriptionPlans.isActive, true)))
    .limit(1);

  if (!plan) throw new Error(`Plan ${planId} not found or inactive`);

  const id = randomUUID();

  await db.insert(saasSchoolSubscriptions).values({
    id,
    schoolId,
    planId,
    status: "pending_payment",
    billingPeriod: "TERM",
    amount: plan.termlyPrice,
    currency: plan.currency,
  });

  await writeSaasAuditLog({
    schoolId,
    eventType: "subscription_created",
    details: { planId, planName: plan.name, amount: plan.termlyPrice },
  });

  const [sub] = await db
    .select()
    .from(saasSchoolSubscriptions)
    .where(eq(saasSchoolSubscriptions.id, id))
    .limit(1);

  return sub as SchoolSubscription;
}

// ── 4. Get School Subscription ────────────────────────────────────────────────
/**
 * Returns the most recent subscription for a school.
 */
export async function getSchoolSubscription(
  schoolId: string
): Promise<SchoolSubscription | null> {
  const [sub] = await db
    .select()
    .from(saasSchoolSubscriptions)
    .where(eq(saasSchoolSubscriptions.schoolId, schoolId))
    .orderBy(desc(saasSchoolSubscriptions.createdAt))
    .limit(1);

  return (sub as SchoolSubscription) ?? null;
}

// ── 5. Get Subscription Status ────────────────────────────────────────────────
export async function getSubscriptionStatus(schoolId: string): Promise<SubscriptionStatus> {
  const sub = await getSchoolSubscription(schoolId);

  if (!sub) {
    return { schoolId, status: null, isActive: false, daysRemaining: null, endsAt: null };
  }

  const now = new Date();
  const isActive =
    sub.status === "active" &&
    (!sub.endsAt || sub.endsAt > now);

  const daysRemaining =
    sub.endsAt && isActive
      ? Math.ceil((sub.endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  return {
    schoolId,
    status: sub.status,
    isActive,
    daysRemaining,
    endsAt: sub.endsAt,
  };
}

// ── 6. Is Subscription Active ──────────────────────────────────────────────────
export async function isSubscriptionActive(schoolId: string): Promise<boolean> {
  const status = await getSubscriptionStatus(schoolId);
  return status.isActive;
}

// ── 7. Start Subscription Payment ─────────────────────────────────────────────
/**
 * Generates the payment reference and updates the subscription to link to it.
 * The actual Paystack payment initialization is handled by saas-payments.ts.
 */
export async function startSubscriptionPayment(
  schoolId: string,
  subscriptionId: string
): Promise<{ paymentReference: string; subscriptionId: string }> {
  const reference = `APEX-${schoolId.slice(0, 8).toUpperCase()}-${Date.now()}`;

  await db
    .update(saasSchoolSubscriptions)
    .set({ paymentReference: reference, status: "pending_payment", updatedAt: new Date() })
    .where(
      and(
        eq(saasSchoolSubscriptions.id, subscriptionId),
        eq(saasSchoolSubscriptions.schoolId, schoolId)
      )
    );

  await writeSaasAuditLog({
    schoolId,
    eventType: "payment_initiated",
    details: { subscriptionId, reference },
  });

  return { paymentReference: reference, subscriptionId };
}

// ── 8. Confirm Subscription Payment ───────────────────────────────────────────
/**
 * Activates a subscription after payment is verified.
 * Sets start/end dates for the current term.
 * This is idempotent — calling twice has no extra effect if already active.
 */
export async function confirmSubscriptionPayment(params: {
  schoolId: string;
  subscriptionId: string;
  paystackReference: string;
  amount: number;
  channel?: string;
  paidAt?: Date;
}): Promise<SchoolSubscription> {
  // Check if already activated (idempotency)
  const [existing] = await db
    .select()
    .from(saasSchoolSubscriptions)
    .where(
      and(
        eq(saasSchoolSubscriptions.id, params.subscriptionId),
        eq(saasSchoolSubscriptions.schoolId, params.schoolId)
      )
    )
    .limit(1);

  if (!existing) throw new Error(`Subscription ${params.subscriptionId} not found`);

  if (existing.status === "active") {
    return existing as SchoolSubscription; // Already activated — idempotent
  }

  const now = params.paidAt ?? new Date();
  const endsAt = new Date(now.getTime() + TERM_DURATION_DAYS * 24 * 60 * 60 * 1000);

  // Activate subscription
  await db
    .update(saasSchoolSubscriptions)
    .set({
      status: "active",
      paystackReference: params.paystackReference,
      startsAt: now,
      endsAt,
      lastPaymentAt: now,
      updatedAt: new Date(),
    })
    .where(eq(saasSchoolSubscriptions.id, params.subscriptionId));

  // Record successful payment
  await db.insert(saasSubscriptionPayments).values({
    schoolId: params.schoolId,
    subscriptionId: params.subscriptionId,
    provider: "paystack",
    reference: params.paystackReference,
    paystackReference: params.paystackReference,
    amount: params.amount,
    currency: "NGN",
    status: "success",
    channel: params.channel ?? null,
    paidAt: now,
    metadata: { activatedAt: now.toISOString(), termDays: TERM_DURATION_DAYS },
  });

  await writeSaasAuditLog({
    schoolId: params.schoolId,
    eventType: "payment_confirmed",
    details: {
      subscriptionId: params.subscriptionId,
      paystackReference: params.paystackReference,
      amount: params.amount,
      endsAt: endsAt.toISOString(),
    },
  });

  const [updated] = await db
    .select()
    .from(saasSchoolSubscriptions)
    .where(eq(saasSchoolSubscriptions.id, params.subscriptionId))
    .limit(1);

  return updated as SchoolSubscription;
}

// ── 9. Renew Subscription ──────────────────────────────────────────────────────
/**
 * Creates a new subscription record for the next term.
 * The old subscription is left as-is for historical records.
 */
export async function renewSubscription(
  schoolId: string,
  planId: string
): Promise<SchoolSubscription> {
  const newSub = await createSubscription(schoolId, planId);

  await writeSaasAuditLog({
    schoolId,
    eventType: "subscription_renewal_started",
    details: { planId, newSubscriptionId: newSub.id },
  });

  return newSub;
}

// ── 10. Expire Subscription ────────────────────────────────────────────────────
export async function expireSubscription(schoolId: string): Promise<void> {
  const sub = await getSchoolSubscription(schoolId);
  if (!sub) return;

  await db
    .update(saasSchoolSubscriptions)
    .set({ status: "expired", updatedAt: new Date() })
    .where(
      and(
        eq(saasSchoolSubscriptions.id, sub.id),
        eq(saasSchoolSubscriptions.schoolId, schoolId)
      )
    );

  await writeSaasAuditLog({
    schoolId,
    eventType: "subscription_expired",
    details: { subscriptionId: sub.id },
  });
}

// ── 11. Cancel Subscription ────────────────────────────────────────────────────
export async function cancelSubscription(schoolId: string): Promise<void> {
  const sub = await getSchoolSubscription(schoolId);
  if (!sub) return;

  await db
    .update(saasSchoolSubscriptions)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(saasSchoolSubscriptions.id, sub.id),
        eq(saasSchoolSubscriptions.schoolId, schoolId)
      )
    );

  await writeSaasAuditLog({
    schoolId,
    eventType: "subscription_cancelled",
    details: { subscriptionId: sub.id },
  });
}

// ── 12. Get Subscription History ───────────────────────────────────────────────
export async function getSubscriptionHistory(schoolId: string) {
  return db
    .select()
    .from(saasSchoolSubscriptions)
    .where(eq(saasSchoolSubscriptions.schoolId, schoolId))
    .orderBy(desc(saasSchoolSubscriptions.createdAt));
}

// ── 13. Record Failed Payment ──────────────────────────────────────────────────
export async function recordFailedPayment(params: {
  schoolId: string;
  subscriptionId: string;
  reference: string;
  amount: number;
  reason?: string;
}): Promise<void> {
  // Check idempotency — don't record same failure twice
  const [existingPayment] = await db
    .select()
    .from(saasSubscriptionPayments)
    .where(eq(saasSubscriptionPayments.reference, params.reference))
    .limit(1);

  if (existingPayment) return; // Already recorded

  await db.insert(saasSubscriptionPayments).values({
    schoolId: params.schoolId,
    subscriptionId: params.subscriptionId,
    provider: "paystack",
    reference: params.reference,
    amount: params.amount,
    currency: "NGN",
    status: "failed",
    metadata: { reason: params.reason ?? "payment_failed" },
  });

  await db
    .update(saasSchoolSubscriptions)
    .set({ status: "payment_failed", updatedAt: new Date() })
    .where(
      and(
        eq(saasSchoolSubscriptions.id, params.subscriptionId),
        eq(saasSchoolSubscriptions.schoolId, params.schoolId)
      )
    );

  await writeSaasAuditLog({
    schoolId: params.schoolId,
    eventType: "payment_failed",
    details: { subscriptionId: params.subscriptionId, reference: params.reference, reason: params.reason },
  });
}

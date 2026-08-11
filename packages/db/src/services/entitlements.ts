/**
 * Milestone 29 — Entitlements & Feature Gating Service
 *
 * Enforces feature access based on active subscription tier (Starter / Growth / Enterprise),
 * checks student enrollment capacity limits, handles 7-day grace period transitions,
 * and calculates pro-rated amounts for plan upgrades/downgrades.
 */
import { db } from "../client";
import { eq, count } from "drizzle-orm";
import {
  saasSubscriptionPlans,
  saasSchoolSubscriptions,
  saasSubscriptionUsages,
  students,
} from "../schema/index";

export interface EntitlementStatus {
  schoolId: string;
  planName: string;
  status: string;
  isGracePeriod: boolean;
  gracePeriodEndsAt: Date | null;
  activeStudents: number;
  maxStudentsLimit: number;
  allowedModules: string[];
  canAddStudent: boolean;
}

const GRACE_PERIOD_DAYS = 7;

// ── 1. Check Student Capacity Limit ───────────────────────────────────────────
export async function checkStudentCapacity(schoolId: string): Promise<{
  currentCount: number;
  maxLimit: number;
  canAddMore: boolean;
}> {
  const [studentResult] = await db
    .select({ total: count() })
    .from(students)
    .where(eq(students.schoolId, schoolId));

  const currentCount = Number(studentResult?.total ?? 0);

  // Get active subscription usage/limit
  const [sub] = await db
    .select({
      planId: saasSchoolSubscriptions.planId,
      status: saasSchoolSubscriptions.status,
    })
    .from(saasSchoolSubscriptions)
    .where(eq(saasSchoolSubscriptions.schoolId, schoolId))
    .limit(1);

  if (!sub) {
    return { currentCount, maxLimit: 200, canAddMore: false };
  }

  const [plan] = await db
    .select()
    .from(saasSubscriptionPlans)
    .where(eq(saasSubscriptionPlans.id, sub.planId))
    .limit(1);

  const features = (plan?.features as { maxStudents?: number }) || {};
  const maxLimit = features.maxStudents ?? 200;

  const canAddMore = maxLimit === -1 || currentCount < maxLimit;

  return { currentCount, maxLimit, canAddMore };
}

// ── 2. Get Full Entitlement Status ───────────────────────────────────────────
export async function getEntitlementStatus(schoolId: string): Promise<EntitlementStatus> {
  const capacity = await checkStudentCapacity(schoolId);

  const [sub] = await db
    .select()
    .from(saasSchoolSubscriptions)
    .where(eq(saasSchoolSubscriptions.schoolId, schoolId))
    .limit(1);

  if (!sub) {
    return {
      schoolId,
      planName: "None",
      status: "none",
      isGracePeriod: false,
      gracePeriodEndsAt: null,
      activeStudents: capacity.currentCount,
      maxStudentsLimit: 200,
      allowedModules: ["sis"],
      canAddStudent: false,
    };
  }

  const [plan] = await db
    .select()
    .from(saasSubscriptionPlans)
    .where(eq(saasSubscriptionPlans.id, sub.planId))
    .limit(1);

  const features = (plan?.features as { maxStudents?: number; modules?: string[] }) || {};
  const allowedModules = features.modules || ["sis", "attendance", "timetable", "grades"];

  // Check 7-day grace period if subscription is expired
  const now = new Date();
  let isGracePeriod = false;
  let gracePeriodEndsAt: Date | null = null;

  if (sub.endsAt && sub.endsAt < now) {
    gracePeriodEndsAt = new Date(sub.endsAt.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    if (now <= gracePeriodEndsAt) {
      isGracePeriod = true;
    }
  }

  return {
    schoolId,
    planName: plan?.name ?? "Standard",
    status: isGracePeriod ? "grace_period" : sub.status,
    isGracePeriod,
    gracePeriodEndsAt,
    activeStudents: capacity.currentCount,
    maxStudentsLimit: capacity.maxLimit,
    allowedModules,
    canAddStudent: capacity.canAddMore,
  };
}

// ── 3. Calculate Pro-Rated Upgrade Amount ────────────────────────────────────
export function calculateProratedUpgradeAmount(params: {
  currentPlanPrice: number;
  newPlanPrice: number;
  termDaysRemaining: number;
  totalTermDays?: number;
}): number {
  const totalTermDays = params.totalTermDays || 91;
  const daysUsed = Math.max(0, totalTermDays - params.termDaysRemaining);

  const currentDailyRate = params.currentPlanPrice / totalTermDays;
  const newDailyRate = params.newPlanPrice / totalTermDays;

  const unusedCurrentCredit = currentDailyRate * params.termDaysRemaining;
  const costOfNewPlanRemaining = newDailyRate * params.termDaysRemaining;

  const proratedCharge = Math.max(0, costOfNewPlanRemaining - unusedCurrentCredit);
  return Math.round(proratedCharge);
}

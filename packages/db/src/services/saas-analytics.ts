/**
 * Milestone 29 — SaaS Analytics & Revenue Service
 *
 * Calculates platform-wide financial & operational SaaS metrics:
 *   - TRR (Termly Recurring Revenue)
 *   - MRR (Monthly Recurring Revenue equivalent = TRR / 3)
 *   - Active School Count vs Suspended/Expired Count
 *   - Churn Rate
 *   - Billing Breakdown
 */
import { db } from "../client";
import { eq, count, sql } from "drizzle-orm";
import {
  schools,
  saasSchoolSubscriptions,
  saasSubscriptionPayments,
} from "../schema/index";

export interface SaasMetrics {
  totalSchools: number;
  activeSchools: number;
  suspendedSchools: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  termlyRecurringRevenue: number; // TRR (NGN)
  monthlyRecurringRevenue: number; // MRR (NGN = TRR / 3)
  churnRatePercent: number;
  totalCollectedRevenue: number;
}

export async function getSaasPlatformMetrics(): Promise<SaasMetrics> {
  const [totalSchoolsRes] = await db.select({ total: count() }).from(schools);
  const [activeSchoolsRes] = await db.select({ total: count() }).from(schools).where(eq(schools.isActive, true));

  const totalSchools = Number(totalSchoolsRes?.total ?? 0);
  const activeSchools = Number(activeSchoolsRes?.total ?? 0);
  const suspendedSchools = Math.max(0, totalSchools - activeSchools);

  const [activeSubsRes] = await db
    .select({ total: count() })
    .from(saasSchoolSubscriptions)
    .where(eq(saasSchoolSubscriptions.status, "active"));

  const [expiredSubsRes] = await db
    .select({ total: count() })
    .from(saasSchoolSubscriptions)
    .where(eq(saasSchoolSubscriptions.status, "expired"));

  const activeSubscriptions = Number(activeSubsRes?.total ?? 0);
  const expiredSubscriptions = Number(expiredSubsRes?.total ?? 0);

  // Sum active subscription amounts to compute TRR
  const [trrResult] = await db
    .select({ trr: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(saasSchoolSubscriptions)
    .where(eq(saasSchoolSubscriptions.status, "active"));

  const termlyRecurringRevenue = Number(trrResult?.trr ?? 0);
  const monthlyRecurringRevenue = Math.round(termlyRecurringRevenue / 3);

  // Sum all successful payments for total collected revenue
  const [revenueResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(saasSubscriptionPayments)
    .where(eq(saasSubscriptionPayments.status, "success"));

  const totalCollectedRevenue = Number(revenueResult?.total ?? 0);

  // Calculate churn rate: expired / (active + expired)
  const totalSubscribers = activeSubscriptions + expiredSubscriptions;
  const churnRatePercent =
    totalSubscribers > 0
      ? Number(((expiredSubscriptions / totalSubscribers) * 100).toFixed(1))
      : 0;

  return {
    totalSchools,
    activeSchools,
    suspendedSchools,
    activeSubscriptions,
    expiredSubscriptions,
    termlyRecurringRevenue,
    monthlyRecurringRevenue,
    churnRatePercent,
    totalCollectedRevenue,
  };
}

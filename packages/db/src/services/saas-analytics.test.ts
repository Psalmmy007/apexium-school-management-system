import { describe, it, expect, beforeAll } from "vitest";
import { getSaasPlatformMetrics } from "./saas-analytics";
import { seedDefaultSubscriptionPlans } from "./subscriptions";

describe("Milestone 29 — SaaS Analytics Service", () => {
  beforeAll(async () => {
    await seedDefaultSubscriptionPlans();
  });

  it("should calculate platform metrics (total schools, active subscriptions, TRR, MRR, churn rate)", async () => {
    const metrics = await getSaasPlatformMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.totalSchools).toBe("number");
    expect(typeof metrics.termlyRecurringRevenue).toBe("number");
    expect(typeof metrics.monthlyRecurringRevenue).toBe("number");
    expect(typeof metrics.churnRatePercent).toBe("number");
  });
});

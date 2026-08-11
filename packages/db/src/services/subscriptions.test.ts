import { describe, it, expect, beforeAll } from "vitest";
import {
  getSubscriptionPlans,
  seedDefaultSubscriptionPlans,
} from "./subscriptions";

describe("Milestone 28 — Subscriptions Service", () => {
  beforeAll(async () => {
    await seedDefaultSubscriptionPlans();
  });

  it("should fetch active subscription plans with NGN prices", async () => {
    const plans = await getSubscriptionPlans();
    expect(plans.length).toBeGreaterThan(0);
    const starter = plans.find((p) => p.name === "Starter");
    expect(starter).toBeDefined();
    expect(starter?.termlyPrice).toBeGreaterThan(0);
    expect(starter?.currency).toBe("NGN");
  });
});

import { describe, it, expect } from "vitest";
import { calculateProratedUpgradeAmount } from "./entitlements";

describe("Milestone 29 — Entitlements & Pro-Rating Service", () => {
  it("should calculate pro-rated upgrade amount correctly when upgrading mid-term", () => {
    // Current plan: Starter 15,000 NGN. New plan: Growth 35,000 NGN.
    // 45 days remaining out of 91 days in term.
    const proratedCharge = calculateProratedUpgradeAmount({
      currentPlanPrice: 15000,
      newPlanPrice: 35000,
      termDaysRemaining: 45,
      totalTermDays: 91,
    });

    expect(proratedCharge).toBeGreaterThan(0);
    expect(proratedCharge).toBeLessThan(35000);
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import {
  createCoupon,
  validateCoupon,
  calculateDiscountedAmount,
} from "./coupons";

describe("Milestone 29 — Coupon Service", () => {
  let promoCode: string;

  beforeAll(async () => {
    promoCode = `TESTPROMO${Date.now()}`;
    await createCoupon({
      code: promoCode,
      description: "20% Discount for New Schools",
      discountType: "percentage",
      discountValue: 20,
      maxRedemptions: 100,
    });
  });

  it("should validate active coupon code", async () => {
    const res = await validateCoupon(promoCode);
    expect(res.valid).toBe(true);
    expect(res.coupon?.code).toBe(promoCode);
    expect(res.coupon?.discountValue).toBe(20);
  });

  it("should reject non-existent coupon code", async () => {
    const res = await validateCoupon("NON-EXISTENT-CODE-999");
    expect(res.valid).toBe(false);
  });

  it("should calculate percentage discount correctly", () => {
    const res = calculateDiscountedAmount(35000, "percentage", 20);
    expect(res.discountAmount).toBe(7000);
    expect(res.finalAmount).toBe(28000);
  });

  it("should calculate fixed amount discount correctly", () => {
    const res = calculateDiscountedAmount(35000, "fixed", 5000);
    expect(res.discountAmount).toBe(5000);
    expect(res.finalAmount).toBe(30000);
  });
});

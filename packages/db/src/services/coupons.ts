/**
 * Milestone 29 — Coupon Service
 *
 * Handles promotional discount codes for subscription checkouts.
 */
import { db } from "../client";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { saasCoupons } from "../schema/index";

export interface CouponData {
  id: string;
  code: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxRedemptions: number | null;
  redemptionsCount: number;
  expiresAt: Date | null;
  isActive: boolean;
}

// ── 1. Create Coupon ──────────────────────────────────────────────────────────
export async function createCoupon(params: {
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxRedemptions?: number;
  expiresAt?: Date;
}): Promise<CouponData> {
  const code = params.code.trim().toUpperCase();
  const id = randomUUID();

  await db.insert(saasCoupons).values({
    id,
    code,
    description: params.description ?? null,
    discountType: params.discountType,
    discountValue: params.discountValue,
    maxRedemptions: params.maxRedemptions ?? null,
    expiresAt: params.expiresAt ?? null,
    isActive: true,
  });

  const [coupon] = await db
    .select()
    .from(saasCoupons)
    .where(eq(saasCoupons.id, id))
    .limit(1);

  return coupon as CouponData;
}

// ── 2. Validate Coupon ────────────────────────────────────────────────────────
export async function validateCoupon(code: string): Promise<{
  valid: boolean;
  coupon?: CouponData;
  reason?: string;
}> {
  const cleanCode = code.trim().toUpperCase();

  const [coupon] = await db
    .select()
    .from(saasCoupons)
    .where(and(eq(saasCoupons.code, cleanCode), eq(saasCoupons.isActive, true)))
    .limit(1);

  if (!coupon) {
    return { valid: false, reason: "Invalid or inactive coupon code" };
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { valid: false, reason: "Coupon code has expired" };
  }

  if (
    coupon.maxRedemptions !== null &&
    coupon.redemptionsCount >= coupon.maxRedemptions
  ) {
    return { valid: false, reason: "Coupon code redemption limit reached" };
  }

  return { valid: true, coupon: coupon as CouponData };
}

// ── 3. Apply Coupon Discount to Subtotal ──────────────────────────────────────
export function calculateDiscountedAmount(
  subtotal: number,
  discountType: "percentage" | "fixed",
  discountValue: number
): { discountAmount: number; finalAmount: number } {
  let discountAmount = 0;

  if (discountType === "percentage") {
    discountAmount = (subtotal * discountValue) / 100;
  } else {
    discountAmount = discountValue;
  }

  discountAmount = Math.min(discountAmount, subtotal);
  const finalAmount = Math.max(0, subtotal - discountAmount);

  return { discountAmount, finalAmount };
}

// ── 4. Redeem Coupon ──────────────────────────────────────────────────────────
export async function redeemCoupon(code: string): Promise<void> {
  const validation = await validateCoupon(code);
  if (!validation.valid || !validation.coupon) {
    throw new Error(validation.reason || "Invalid coupon");
  }

  await db
    .update(saasCoupons)
    .set({
      redemptionsCount: sql`${saasCoupons.redemptionsCount} + 1`,
    })
    .where(eq(saasCoupons.id, validation.coupon.id));
}

/**
 * POST /api/saas/coupons/validate
 *
 * Validates a promotional coupon code and calculates the discount for a given subtotal.
 */
import { NextRequest, NextResponse } from "next/server";
import { validateCoupon, calculateDiscountedAmount } from "@apexium/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, subtotal = 0 } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    const validation = await validateCoupon(code);

    if (!validation.valid || !validation.coupon) {
      return NextResponse.json({
        valid: false,
        reason: validation.reason || "Invalid coupon code",
      }, { status: 400 });
    }

    const coupon = validation.coupon;
    const discountResult = calculateDiscountedAmount(
      Number(subtotal),
      coupon.discountType,
      coupon.discountValue
    );

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description,
      },
      subtotal: Number(subtotal),
      discountAmount: discountResult.discountAmount,
      finalAmount: discountResult.finalAmount,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Coupon validation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

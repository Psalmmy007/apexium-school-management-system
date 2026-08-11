"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function SubscribeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = searchParams.get("planId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!planId) {
      setError("Please select a plan from the pricing page.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create subscription
      const subRes = await fetch("/api/saas/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const subData = await subRes.json();
      if (!subRes.ok) throw new Error(subData.error || "Failed to create subscription");

      // 2. Initialize Paystack payment
      const payRes = await fetch("/api/saas/subscription/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error || "Failed to initialize payment");

      // 3. Redirect to Paystack or verification callback
      if (payData.authorizationUrl) {
        window.location.href = payData.authorizationUrl;
      } else {
        router.push(`/api/saas/subscription/verify?ref=${payData.reference}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred during subscription.");
    } finally {
      setLoading(false);
    }
  };

  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discountAmount: number; finalAmount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/saas/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, subtotal: 35000 }), // default Growth tier subtotal
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.reason || "Invalid coupon code");
      }

      setCouponApplied({
        code: data.coupon.code,
        discountAmount: data.discountAmount,
        finalAmount: data.finalAmount,
      });
    } catch (err: unknown) {
      setCouponError(err instanceof Error ? err.message : "Coupon failed");
    } finally {
      setCouponLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-extrabold text-white">Confirm Subscription</h2>
        <p className="mt-2 text-sm text-slate-400">
          Complete your termly subscription to activate your school&apos;s ERP subdomain.
        </p>

        {error && (
          <div className="mt-6 bg-red-950/60 border border-red-800 text-red-300 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="mt-8 bg-slate-900 border border-slate-800 p-8 rounded-2xl text-left space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Promotional Coupon Code
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="PROMO2026"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-xs transition disabled:opacity-50"
              >
                {couponLoading ? "Validating..." : "Apply"}
              </button>
            </div>
            {couponError && <p className="mt-2 text-xs text-red-400">{couponError}</p>}
            {couponApplied && (
              <div className="mt-2 p-3 bg-green-950/40 border border-green-800/60 rounded-xl text-xs text-green-300 flex justify-between">
                <span>Coupon <strong>{couponApplied.code}</strong> Applied!</span>
                <span>- ₦{couponApplied.discountAmount.toLocaleString()}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg transition-all text-base disabled:opacity-50"
          >
            {loading ? "Initializing Checkout..." : "Proceed to Paystack Payment →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-8 text-center">Loading checkout...</div>}>
      <SubscribeContent />
    </Suspense>
  );
}

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-extrabold text-white">Confirm Subscription</h2>
        <p className="mt-2 text-sm text-slate-400">
          Complete your termly subscription to activate your school's ERP subdomain.
        </p>

        {error && (
          <div className="mt-6 bg-red-950/60 border border-red-800 text-red-300 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="mt-8 bg-slate-900 border border-slate-800 p-8 rounded-2xl">
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

"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const payment = searchParams.get("payment");
  const ref = searchParams.get("reference") || searchParams.get("ref");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-center">
      <div className="sm:mx-auto sm:w-full sm:max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
        {payment === "failed" || payment === "error" ? (
          <>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-500/20 text-red-400 text-2xl font-bold mb-4">
              ✕
            </div>
            <h2 className="text-2xl font-bold text-white">Payment Failed</h2>
            <p className="mt-2 text-sm text-slate-400">
              We couldn&apos;t confirm your subscription payment. Please retry below.
            </p>
            <div className="mt-6">
              <Link
                href="/subscribe"
                className="block w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition text-sm"
              >
                Retry Payment →
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 text-green-400 text-2xl font-bold mb-4">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-white">Payment Confirmed</h2>
            <p className="mt-2 text-sm text-slate-400">
              Your termly subscription is active. Click below to continue setup.
            </p>
            <div className="mt-6">
              <Link
                href="/onboarding"
                className="block w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl transition text-sm"
              >
                Continue Onboarding →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-8 text-center">Loading status...</div>}>
      <PaymentContent />
    </Suspense>
  );
}

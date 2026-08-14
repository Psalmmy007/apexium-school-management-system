"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { tokens } from "@/lib/design-system/tokens";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  termlyPrice: number;
  currency: string;
  features: { maxStudents?: number; modules?: string[] } | null;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/saas/plans")
      .then((res) => res.json())
      .then((data) => {
        if (data.plans) setPlans(data.plans);
        else setError("Failed to load plans");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={tokens.pageContainer + " overflow-x-hidden"}>
      {/* ── Fixed Header Navigation ───────────────────────────────────────── */}
      <PublicHeader />

      {/* ── Pricing Content Area with Proper Top Padding ───────────────────── */}
      <main className="pt-36 pb-20 sm:pt-44 sm:pb-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Simple, Termly Subscription Pricing
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            No hidden fees or foreign exchange fluctuation. Pay per school term with instant setup and full feature access.
          </p>
        </div>

        {loading ? (
          <div className="mt-16 text-center text-slate-400 text-sm">Loading subscription plans...</div>
        ) : error ? (
          <div className="mt-16 text-center text-red-400 text-sm">{error}</div>
        ) : (
          <div className="mt-12 sm:mt-16 max-w-7xl mx-auto grid grid-cols-1 gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-md"
              >
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">{plan.name}</h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-400 min-h-[40px]">{plan.description}</p>
                  <div className="mt-6 flex items-baseline text-white">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                      ₦{plan.termlyPrice.toLocaleString()}
                    </span>
                    <span className="ml-2 text-slate-400 text-xs sm:text-sm font-medium">/ term</span>
                  </div>
                </div>

                <div className="mt-8">
                  <Link
                    href={`/subscribe?planId=${plan.id}`}
                    className="w-full text-center py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <span>Select {plan.name} Plan</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className={tokens.footer}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-300">Apexium ERP</span>
            <span>•</span>
            <span>School Management System</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link href="/" className="hover:text-slate-300 transition-colors py-1">
              Home
            </Link>
            <Link href="/register" className="hover:text-slate-300 transition-colors py-1">
              Register School
            </Link>
            <Link href="/auth/login" className="hover:text-slate-300 transition-colors py-1">
              School Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

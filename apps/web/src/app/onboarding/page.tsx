"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface OnboardingInfo {
  status: string;
  currentStep: string;
  completedSteps: string[];
  isComplete: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [onboarding, setOnboarding] = useState<OnboardingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/saas/onboarding")
      .then((res) => res.json())
      .then((data) => {
        if (data.onboarding) setOnboarding(data.onboarding);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStartSetup = () => {
    router.push("/dashboard/setup");
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-white p-8 text-center">Loading onboarding status...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
        <h1 className="text-3xl font-extrabold text-white">School Onboarding Progress</h1>
        <p className="mt-2 text-slate-400 text-sm">
          Follow these steps to complete your school setup.
        </p>

        <div className="mt-8 space-y-4">
          <div className="flex items-center p-4 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="h-8 w-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold mr-4 text-sm">✓</span>
            <div>
              <div className="font-semibold text-white">1. School Registration & Subdomain</div>
              <div className="text-xs text-slate-400">School tenant and admin account created</div>
            </div>
          </div>

          <div className="flex items-center p-4 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="h-8 w-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold mr-4 text-sm">✓</span>
            <div>
              <div className="font-semibold text-white">2. Termly Subscription</div>
              <div className="text-xs text-slate-400">Subscription plan selected and active</div>
            </div>
          </div>

          <div className="flex items-center p-4 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="h-8 w-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold mr-4 text-sm">3</span>
            <div>
              <div className="font-semibold text-white">3. School Setup Wizard</div>
              <div className="text-xs text-slate-400">Configure Academic Session, Terms, Classes, and Staff</div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <button
            onClick={handleStartSetup}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg text-center"
          >
            Launch Setup Wizard →
          </button>
        </div>
      </div>
    </div>
  );
}

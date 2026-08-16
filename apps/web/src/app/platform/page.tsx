"use client";

import React, { useEffect, useState } from "react";
import { BackNavigation } from "@/components/ui/BackNavigation";

interface PlatformSchool {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  domain: string;
  subscriptionStatus: string;
  onboardingStatus: string;
}

interface SaasMetrics {
  totalSchools: number;
  activeSchools: number;
  suspendedSchools: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  termlyRecurringRevenue: number;
  monthlyRecurringRevenue: number;
  churnRatePercent: number;
  totalCollectedRevenue: number;
}

export default function PlatformAdminDashboard() {
  const [schools, setSchools] = useState<PlatformSchool[]>([]);
  const [metrics, setMetrics] = useState<SaasMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/platform/schools").then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || `HTTP ${res.status} Unauthorized`);
        }
        return res.json();
      }),
      fetch("/api/saas/analytics").then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || `HTTP ${res.status} Unauthorized`);
        }
        return res.json();
      }),
    ])
      .then(([schoolsData, analyticsData]) => {
        if (schoolsData.schools) setSchools(schoolsData.schools);
        if (analyticsData.metrics) setMetrics(analyticsData.metrics);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <BackNavigation label="Back to Application" href="/dashboard" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Apexium Platform Administration
            </h1>
            <p className="text-sm text-slate-400 mt-1">SaaS Multi-School Tenant Overview</p>
          </div>
          <div className="self-start sm:self-auto bg-indigo-950/60 border border-indigo-800/80 px-3.5 py-1.5 rounded-xl text-indigo-300 text-xs font-semibold">
            Platform Operator Context
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading platform metrics...</div>
        ) : error ? (
          <div className="bg-red-950/40 border border-red-800/60 text-red-300 p-6 rounded-2xl text-sm font-medium">
            {error}
          </div>
        ) : (
          <React.Fragment>
            {metrics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Termly Recurring Rev (TRR)</div>
                  <div className="text-2xl font-extrabold text-white mt-2">₦{metrics.termlyRecurringRevenue.toLocaleString()}</div>
                  <div className="text-xs text-indigo-400 mt-1">MRR ₦{metrics.monthlyRecurringRevenue.toLocaleString()}/mo</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active School Tenants</div>
                  <div className="text-2xl font-extrabold text-emerald-400 mt-2">{metrics.activeSchools}</div>
                  <div className="text-xs text-slate-500 mt-1">Total {metrics.totalSchools} registered</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Subscriptions</div>
                  <div className="text-2xl font-extrabold text-blue-400 mt-2">{metrics.activeSubscriptions}</div>
                  <div className="text-xs text-slate-500 mt-1">{metrics.expiredSubscriptions} expired</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">SaaS Churn Rate</div>
                  <div className="text-2xl font-extrabold text-purple-400 mt-2">{metrics.churnRatePercent}%</div>
                  <div className="text-xs text-slate-500 mt-1">Termly retention</div>
                </div>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">Registered School Tenants ({schools.length})</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">School Name</th>
                      <th className="px-6 py-4">Slug & Domain</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Subscription</th>
                      <th className="px-6 py-4">Onboarding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {schools.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                          No registered school tenants found.
                        </td>
                      </tr>
                    ) : (
                      schools.map((school) => (
                        <tr key={school.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-6 py-4 font-medium text-white">{school.name}</td>
                          <td className="px-6 py-4 text-xs font-mono text-indigo-400">{school.domain}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                school.isActive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {school.isActive ? "Active" : "Suspended"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 capitalize">
                              {school.subscriptionStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">{school.onboardingStatus}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

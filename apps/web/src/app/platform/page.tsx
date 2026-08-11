"use client";

import React, { useEffect, useState } from "react";

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

export default function PlatformAdminDashboard() {
  const [schools, setSchools] = useState<PlatformSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/platform/schools")
      .then((res) => res.json())
      .then((data) => {
        if (data.schools) setSchools(data.schools);
        else setError(data.error || "Failed to load platform dashboard");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Apexium Platform Administration
            </h1>
            <p className="text-sm text-slate-400 mt-1">SaaS Multi-School Tenant Overview</p>
          </div>
          <div className="bg-indigo-950/60 border border-indigo-800 px-4 py-2 rounded-xl text-indigo-300 text-xs font-semibold">
            Platform Operator Context
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading platform data...</div>
        ) : error ? (
          <div className="bg-red-950/60 border border-red-800 text-red-300 p-4 rounded-xl text-sm">{error}</div>
        ) : (
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
                <tbody className="divide-y divide-slate-800">
                  {schools.map((school) => (
                    <tr key={school.id} className="hover:bg-slate-850/50 transition">
                      <td className="px-6 py-4 font-medium text-white">{school.name}</td>
                      <td className="px-6 py-4 text-xs font-mono text-indigo-400">{school.domain}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          school.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }`}>
                          {school.isActive ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 capitalize">
                          {school.subscriptionStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">{school.onboardingStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

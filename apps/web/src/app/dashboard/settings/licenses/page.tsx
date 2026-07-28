"use client";

import { useEffect, useState } from "react";

interface LicenseData {
  id: string;
  schoolId: string;
  licenseKey: string;
  tier: "starter" | "professional" | "growth" | "enterprise";
  status: "active" | "expired" | "suspended";
  seatCap: number;
  enabledModules: string[];
  expiresAt: string | null;
}

interface SuperadminSchoolLicense {
  id: string;
  schoolId: string;
  schoolName: string;
  licenseKey: string;
  tier: string;
  status: string;
  maxStudents: number;
  enabledModules: string[];
  expiresAt: string | null;
  enrolledStudents: number;
}

export default function LicenseSettingsPage() {
  const [viewMode, setViewMode] = useState<"school" | "superadmin">("school");
  
  // School Admin State
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [usedSeats, setUsedSeats] = useState<number>(0);
  const [remainingSeats, setRemainingSeats] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [upgrading, setUpgrading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Superadmin Directory State
  const [superadminList, setSuperadminList] = useState<SuperadminSchoolLicense[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tierFilter, setTierFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [superadminLoading, setSuperadminLoading] = useState<boolean>(false);

  const fetchSchoolLicenseData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/licenses");
      const json = await res.json();
      if (json.success) {
        setLicense(json.data.license);
        setUsedSeats(json.data.usedSeats);
        setRemainingSeats(json.data.remainingSeats);
      } else {
        setMessage({ type: "error", text: json.error || "Failed to load license details." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Network error loading license details." });
    } finally {
      setLoading(false);
    }
  };

  const fetchSuperadminDirectory = async () => {
    setSuperadminLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (tierFilter) params.set("tier", tierFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/licenses?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSuperadminList(json.data.items || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch superadmin license list", err);
    } finally {
      setSuperadminLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolLicenseData();
  }, []);

  useEffect(() => {
    if (viewMode === "superadmin") {
      fetchSuperadminDirectory();
    }
  }, [viewMode, searchQuery, tierFilter, statusFilter]);

  const handleUpgrade = async (targetTier: "starter" | "professional" | "enterprise") => {
    setUpgrading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upgrade", targetTier }),
      });
      const json = await res.json();
      if (json.success) {
        setLicense(json.data.license);
        setUsedSeats(json.data.usedSeats);
        setRemainingSeats(json.data.remainingSeats);
        setMessage({
          type: "success",
          text: `License successfully upgraded to ${targetTier.toUpperCase()} tier!`,
        });
      } else {
        setMessage({ type: "error", text: json.error || "Upgrade failed." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Network error during license upgrade." });
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 font-medium animate-pulse">Loading License Center...</div>
      </div>
    );
  }

  const seatUsagePercentage = license
    ? Math.min(100, Math.round((usedSeats / license.seatCap) * 100))
    : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">License & Subscription Center</h1>
          <p className="text-sm text-gray-600">
            Manage school capacity caps, module access gating, and tier upgrades.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 p-1 rounded-lg flex items-center border border-gray-200">
            <button
              onClick={() => setViewMode("school")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === "school"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              My School License
            </button>
            <button
              onClick={() => setViewMode("superadmin")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === "superadmin"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Superadmin Directory
            </button>
          </div>

          {license && viewMode === "school" && (
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full uppercase ${
                  license.status === "active"
                    ? "bg-green-100 text-green-800 border border-green-300"
                    : "bg-red-100 text-red-800 border border-red-300"
                }`}
              >
                {license.status}
              </span>
              <span className="px-3 py-1 text-xs font-semibold rounded-full uppercase bg-blue-100 text-blue-800 border border-blue-300">
                {license.tier} Tier
              </span>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-md text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── SCHOOL ADMIN VIEW ───────────────────────────────── */}
      {viewMode === "school" && (
        <>
          {/* License Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-2">
              <div className="text-xs font-semibold uppercase text-gray-500">License Key</div>
              <div className="text-lg font-mono font-bold text-gray-900 truncate">
                {license?.licenseKey || "N/A"}
              </div>
              <div className="text-xs text-gray-500">Official tenant license identifier</div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-2">
              <div className="text-xs font-semibold uppercase text-gray-500">Student Seat Usage</div>
              <div className="text-2xl font-bold text-gray-900">
                {usedSeats} / {license?.seatCap || 0}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    seatUsagePercentage > 90 ? "bg-red-600" : "bg-indigo-600"
                  }`}
                  style={{ width: `${seatUsagePercentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">{remainingSeats} seats remaining</div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-2">
              <div className="text-xs font-semibold uppercase text-gray-500">Expiration Status</div>
              <div className="text-lg font-semibold text-gray-900">
                {license?.expiresAt
                  ? new Date(license.expiresAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Lifetime / No Expiry"}
              </div>
              <div className="text-xs text-green-600 font-medium">
                Offline Cached Validation Enabled
              </div>
            </div>
          </div>

          {/* Module Access Gating */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Licensed System Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: "core_erp", name: "Core ERP & SIS", desc: "Students, Attendance, Timetable & Academics" },
                { id: "cbt", name: "CBT Platform", desc: "Online Exams, Auto-Grading & Question Bank" },
                { id: "lms", name: "Learning Portal (LMS)", desc: "Lessons, Assignments & Homework Submissions" },
              ].map((mod) => {
                const isEnabled = license?.enabledModules.includes(mod.id);
                return (
                  <div
                    key={mod.id}
                    className={`p-4 rounded-lg border flex flex-col justify-between ${
                      isEnabled ? "bg-indigo-50/50 border-indigo-200" : "bg-gray-50 border-gray-200 opacity-60"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{mod.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            isEnabled ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {isEnabled ? "Unlocked" : "Locked"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{mod.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Self-Service Tier Upgrade Options */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Self-Service Plan Upgrades</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Starter */}
              <div
                className={`p-5 rounded-xl border flex flex-col justify-between ${
                  license?.tier === "starter" ? "border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50/20" : "border-gray-200"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">Starter</span>
                    {license?.tier === "starter" && (
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                        Current Plan
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">Essential student information system for small schools.</p>
                  <ul className="text-xs text-gray-700 space-y-1">
                    <li>✓ 250 Student Seat Cap</li>
                    <li>✓ Core ERP Module Access</li>
                    <li>✓ Basic Report Card Generation</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleUpgrade("starter")}
                  disabled={upgrading || license?.tier === "starter"}
                  className="mt-4 w-full py-2 px-4 rounded-md text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {license?.tier === "starter" ? "Active" : "Switch to Starter"}
                </button>
              </div>

              {/* Professional */}
              <div
                className={`p-5 rounded-xl border flex flex-col justify-between ${
                  license?.tier === "professional" || license?.tier === "growth" ? "border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50/20" : "border-gray-200"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">Professional</span>
                    {(license?.tier === "professional" || license?.tier === "growth") && (
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                        Current Plan
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">Complete school management package with CBT testing.</p>
                  <ul className="text-xs text-gray-700 space-y-1">
                    <li>✓ 1,000 Student Seat Cap</li>
                    <li>✓ Core ERP + CBT Module Access</li>
                    <li>✓ Priority Bulk Job Processing</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleUpgrade("professional")}
                  disabled={upgrading || license?.tier === "professional" || license?.tier === "growth"}
                  className="mt-4 w-full py-2 px-4 rounded-md text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {license?.tier === "professional" || license?.tier === "growth" ? "Active" : "Upgrade to Professional"}
                </button>
              </div>

              {/* Enterprise */}
              <div
                className={`p-5 rounded-xl border flex flex-col justify-between ${
                  license?.tier === "enterprise" ? "border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50/20" : "border-gray-200"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">Enterprise</span>
                    {license?.tier === "enterprise" && (
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                        Current Plan
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">Unlimited scale for multi-branch institutions.</p>
                  <ul className="text-xs text-gray-700 space-y-1">
                    <li>✓ 5,000 Student Seat Cap</li>
                    <li>✓ All Modules (ERP, CBT & LMS)</li>
                    <li>✓ Dedicated SLA & Support</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleUpgrade("enterprise")}
                  disabled={upgrading || license?.tier === "enterprise"}
                  className="mt-4 w-full py-2 px-4 rounded-md text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {license?.tier === "enterprise" ? "Active" : "Upgrade to Enterprise"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── SUPERADMIN MULTI-TENANT DIRECTORY VIEW ──────────── */}
      {viewMode === "superadmin" && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Global School Licenses Directory</h2>
              <p className="text-xs text-gray-600">Superadmin portal for inspecting and managing all tenant school licenses.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Search school or license key..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Tiers</option>
                <option value="starter">Starter</option>
                <option value="growth">Growth/Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {superadminLoading ? (
            <div className="p-8 text-center text-sm text-gray-500 animate-pulse">Loading all school licenses...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
                    <th className="p-3">School Name</th>
                    <th className="p-3">License Key</th>
                    <th className="p-3">Plan Tier</th>
                    <th className="p-3">Enrolled / Cap</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Expires At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {superadminList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-500">
                        No school licenses match your search filter.
                      </td>
                    </tr>
                  ) : (
                    superadminList.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-3 font-semibold text-gray-900">{item.schoolName || "Unnamed School"}</td>
                        <td className="p-3 font-mono text-gray-700">{item.licenseKey}</td>
                        <td className="p-3 capitalize font-medium text-indigo-700">{item.tier}</td>
                        <td className="p-3">
                          <div className="font-semibold text-gray-900">
                            {item.enrolledStudents || 0} / {item.maxStudents}
                          </div>
                          <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className="h-1.5 rounded-full bg-indigo-600"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round(((item.enrolledStudents || 0) / item.maxStudents) * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              item.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">
                          {item.expiresAt
                            ? new Date(item.expiresAt).toLocaleDateString()
                            : "Lifetime"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { BackNavigation } from "@/components/ui/BackNavigation";

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

export default function LicenseSettingsPage() {
  // School Admin State
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [usedSeats, setUsedSeats] = useState<number>(0);
  const [remainingSeats, setRemainingSeats] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [upgrading, setUpgrading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  useEffect(() => {
    fetchSchoolLicenseData();
  }, []);

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
      {/* Back to Dashboard Navigation */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">License Center</h1>
          <p className="text-sm text-slate-400">
            Manage school capacity caps, module access gating, and tier upgrades.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {license && (
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
              <p className="text-xs text-gray-600">Essential student information and academic management.</p>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>✓ 250 Student Seat Cap</li>
                <li>✓ Core ERP (SIS, Attendance, Grades)</li>
                <li>✓ Basic Report Cards</li>
              </ul>
            </div>
            <button
              onClick={() => handleUpgrade("starter")}
              disabled={upgrading || license?.tier === "starter"}
              className="mt-4 w-full py-2 px-4 rounded-md text-xs font-semibold bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {license?.tier === "starter" ? "Active" : "Downgrade to Starter"}
            </button>
          </div>

          {/* Professional / Growth */}
          <div
            className={`p-5 rounded-xl border flex flex-col justify-between ${
              license?.tier === "professional" || license?.tier === "growth"
                ? "border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50/20"
                : "border-gray-200"
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
              <p className="text-xs text-gray-600">Advanced digital testing and learning management tools.</p>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>✓ 1,000 Student Seat Cap</li>
                <li>✓ CBT Online Exam Engine</li>
                <li>✓ Learning Portal (LMS & Homework)</li>
              </ul>
            </div>
            <button
              onClick={() => handleUpgrade("professional")}
              disabled={upgrading || license?.tier === "professional" || license?.tier === "growth"}
              className="mt-4 w-full py-2 px-4 rounded-md text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {license?.tier === "professional" || license?.tier === "growth"
                ? "Active"
                : "Upgrade to Professional"}
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
    </div>
  );
}

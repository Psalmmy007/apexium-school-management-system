"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, School } from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { tokens } from "@/lib/design-system/tokens";

export default function RegisterSchoolPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    schoolName: "",
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    password: "",
    phone: "",
    address: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/saas/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Redirect to pricing selection step in onboarding flow
      router.push(`/pricing?schoolSlug=${data.schoolSlug}&session=${data.onboardingSessionId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={tokens.pageContainer + " overflow-x-hidden"}>
      {/* ── Fixed Header Navigation ───────────────────────────────────────── */}
      <PublicHeader />

      {/* ── Registration Content Area ─────────────────────────────────────── */}
      <main className="pt-36 pb-20 sm:pt-44 sm:pb-28 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white mb-3 shadow-sm">
              <School className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Register Your School
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              School management software for Nigerian primary and secondary schools
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
          <div className="bg-slate-900 py-8 px-6 shadow-xl rounded-2xl border border-slate-800 sm:px-10">
            {error && (
              <div className="mb-6 bg-red-950/60 border border-red-800 text-red-300 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  School Name *
                </label>
                <input
                  type="text"
                  name="schoolName"
                  required
                  value={formData.schoolName}
                  onChange={handleChange}
                  placeholder="e.g. Apexium Academy Lagos"
                  className="mt-1 block w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Admin First Name *
                  </label>
                  <input
                    type="text"
                    name="adminFirstName"
                    required
                    value={formData.adminFirstName}
                    onChange={handleChange}
                    placeholder="John"
                    className="mt-1 block w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Admin Last Name *
                  </label>
                  <input
                    type="text"
                    name="adminLastName"
                    required
                    value={formData.adminLastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    className="mt-1 block w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Official Email Address *
                </label>
                <input
                  type="email"
                  name="adminEmail"
                  required
                  value={formData.adminEmail}
                  onChange={handleChange}
                  placeholder="admin@school.com"
                  className="mt-1 block w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="mt-1 block w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+234 800 000 0000"
                  className="mt-1 block w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  School Physical Address
                </label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Plot 12, Education Avenue, Victoria Island, Lagos"
                  className="mt-1 block w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all min-h-[44px] items-center gap-2"
                >
                  <span>{loading ? "Registering Institution..." : "Continue to Plan Selection"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="mt-6 text-center text-xs text-slate-400">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
                Sign in to your school
              </Link>
            </div>
          </div>
        </div>
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
            <Link href="/pricing" className="hover:text-slate-300 transition-colors py-1">
              Pricing
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

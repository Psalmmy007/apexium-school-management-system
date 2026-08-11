"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            Apexium ERP
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Register Your School
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Start managing your school with Nigeria&apos;s #1 School ERP platform
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-slate-900/80 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
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
                className="mt-1 block w-full rounded-xl bg-slate-800/90 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
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
                  className="mt-1 block w-full rounded-xl bg-slate-800/90 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
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
                  className="mt-1 block w-full rounded-xl bg-slate-800/90 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">
                Admin Email *
              </label>
              <input
                type="email"
                name="adminEmail"
                required
                value={formData.adminEmail}
                onChange={handleChange}
                placeholder="admin@school.edu.ng"
                className="mt-1 block w-full rounded-xl bg-slate-800/90 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
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
                minLength={8}
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                className="mt-1 block w-full rounded-xl bg-slate-800/90 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="mt-1 block w-full rounded-xl bg-slate-800/90 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  School Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Lagos, Nigeria"
                  className="mt-1 block w-full rounded-xl bg-slate-800/90 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-200 disabled:opacity-50 text-sm"
            >
              {loading ? "Registering School..." : "Continue to Select Plan →"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already registered your school?{" "}
            <Link href="/auth/login" className="text-indigo-400 hover:underline">
              Log in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

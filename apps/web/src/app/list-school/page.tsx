"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/public/PublicHeader";
import { tokens } from "@/lib/design-system/tokens";
import {
  School,
  Mail,
  Phone,
  MapPin,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara"
];

export default function ListSchoolPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    state: "Lagos",
    city: "",
    schoolType: "combined",
    address: "",
    logoUrl: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    schoolName: string;
    email: string;
    flagged: boolean;
    verificationToken?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/schools/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit directory listing.");
      }

      setSuccessData({
        schoolName: data.school.name,
        email: data.school.email,
        flagged: data.flaggedDomainMismatch,
        verificationToken: data.verificationToken,
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <PublicHeader />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {successData ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Listing Submitted Successfully!
            </h1>

            <p className="text-slate-300 text-sm sm:text-base mb-6 leading-relaxed">
              We have sent a verification link to <strong className="text-indigo-400">{successData.email}</strong>. 
              Your free listing for <strong className="text-white">{successData.schoolName}</strong> will become publicly discoverable in the school directory as soon as you verify your email.
            </p>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 text-left mb-8 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Next Steps for Verification:</span>
              </div>
              <p>1. Open the inbox for <span className="text-slate-200">{successData.email}</span>.</p>
              <p>2. Click the verification link to confirm your institution&apos;s email address.</p>
              <p>3. Your profile goes live immediately in the Apexium School Directory.</p>
              {successData.flagged && (
                <p className="text-amber-400/90 pt-1">
                  Note: A standard platform ownership review flag was noted for non-institutional email domains.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl transition-colors text-sm"
              >
                Return to Homepage
              </Link>
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <span>Upgrade to Full School ERP</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
            {/* Header Banner */}
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Free Directory Listing</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                List Your School &amp; Get Found by Parents
              </h1>

              <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
                Add your school to the national Apexium directory for free. Help prospective parents in your state discover your campus, view your contact details, and inquire about enrollment.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1: School Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  School Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <School className="w-4 h-4" />
                  </div>
                  <input
                    id="list-school-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Apexium Model College"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Row 2: School Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Official School Email <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="list-school-email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="info@yourschool.edu.ng"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    A real verification link will be sent to this email.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Contact Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="list-school-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+234 800 000 0000"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: School Type, State, City */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    School Type
                  </label>
                  <select
                    id="list-school-type"
                    value={formData.schoolType}
                    onChange={(e) => setFormData({ ...formData, schoolType: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  >
                    <option value="nursery">Nursery &amp; Creche</option>
                    <option value="primary">Primary School</option>
                    <option value="secondary">Secondary School</option>
                    <option value="combined">Combined All-Through</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    State
                  </label>
                  <select
                    id="list-school-state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  >
                    {NIGERIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    City / Town
                  </label>
                  <input
                    id="list-school-city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Ikeja, Lekki, Ibadan"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Row 4: Physical Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Physical Campus Address
                </label>
                <div className="relative">
                  <div className="absolute top-3.5 left-3.5 pointer-events-none text-slate-500">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <textarea
                    id="list-school-address"
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Plot 12, Academic Crescent, Victoria Island"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  id="submit-directory-listing-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verifying Domain &amp; Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Free Directory Listing</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Honest Distinction Notice */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
              <p className="text-xs text-slate-400">
                Need full ERP capabilities like attendance, grade calculations, WAEC transcripts, and parent fee portals?{" "}
                <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold underline">
                  Register for the full Apexium School ERP trial instead →
                </Link>
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 border-t border-slate-900 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Apexium ERP. Secure School Directory &amp; Management Platform.
      </footer>
    </div>
  );
}

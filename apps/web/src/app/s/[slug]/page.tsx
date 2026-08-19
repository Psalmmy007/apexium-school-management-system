import React from "react";
import Link from "next/link";
import { db, schools } from "@apexium/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { GraduationCap, ArrowRight, Search, Lock, School as SchoolIcon, FileText, CheckCircle2 } from "lucide-react";

interface Props {
  params: {
    slug: string;
  };
}

export const dynamic = "force-dynamic";

export default async function SchoolSlugLandingPage({ params }: Props) {
  const { slug } = params;

  // Look up school tenant
  const [school] = await db.select().from(schools).where(eq(schools.slug, slug)).limit(1);

  if (!school) {
    notFound();
  }

  const schoolName = school.name || "School Portal";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Navigation Header */}
      <header className="p-6 relative z-10 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <SchoolIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-white leading-tight">{schoolName}</h1>
              <p className="text-xs text-slate-400">Official School Gateway</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/s/${slug}/auth/login`}
              className="text-xs font-semibold px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60 border border-slate-700/60 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Portal Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="max-w-5xl mx-auto px-4 py-16 sm:py-24 relative z-10 w-full text-center flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>2026/2027 Academic Admissions Now Open</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight max-w-3xl mx-auto leading-tight">
          Welcome to {schoolName}
        </h2>

        <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Submit prospective student applications, schedule entrance assessments, track status, and access the school management portal.
        </p>

        {/* Action Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl text-left">
          {/* Card 1: Apply for Admission */}
          <div className="bg-gradient-to-b from-indigo-950/40 to-slate-900/60 border border-indigo-500/30 rounded-2xl p-6 hover:border-indigo-500/60 transition-all flex flex-col justify-between group shadow-xl shadow-indigo-950/20">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">Apply for Admission</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Complete and submit our online student enrollment application form in minutes.
              </p>
            </div>
            <Link
              href={`/s/${slug}/admissions`}
              className="inline-flex items-center justify-center w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/25 gap-2"
            >
              <span>Start Application</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Track Application */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">Track Application</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Check your admission status, view scheduled interviews, and sit entrance assessments.
              </p>
            </div>
            <Link
              href={`/s/${slug}/admissions/track`}
              className="inline-flex items-center justify-center w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl transition-all border border-slate-700 gap-2"
            >
              <span>Track Status</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3: Portal Sign In */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">School Portal Login</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Enrolled students, parents, teachers, and administrators access dashboards here.
              </p>
            </div>
            <Link
              href={`/s/${slug}/auth/login`}
              className="inline-flex items-center justify-center w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl transition-all border border-slate-700 gap-2"
            >
              <span>Sign In to Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-600 relative z-10 border-t border-slate-800/60">
        Powered by Apexium ERP • Secure School Management Platform
      </footer>
    </div>
  );
}

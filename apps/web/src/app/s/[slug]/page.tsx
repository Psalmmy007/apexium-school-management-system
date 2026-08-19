import React from "react";
import Link from "next/link";
import { db, schools, classes, terms, trackSchoolProfileView } from "@apexium/db";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import {
  GraduationCap,
  ArrowRight,
  Search,
  Lock,
  School as SchoolIcon,
  FileText,
  MapPin,
  Phone,
  Mail,
  Building,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface Props {
  params: {
    slug: string;
  };
}

export const dynamic = "force-dynamic";

export default async function SchoolSlugLandingPage({ params }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const slug = (resolvedParams?.slug || "portal").toLowerCase();

  // Look up school tenant
  const [school] = await db
    .select()
    .from(schools)
    .where(or(eq(schools.slug, slug), ilike(schools.slug, slug)))
    .limit(1);

  console.log("SchoolSlugLandingPage lookup:", {
    slug,
    schoolFound: !!school,
    schoolName: school?.name,
    listingStatus: school?.listingStatus,
    rawListingStatus: (school as any)?.listing_status,
  });

  const isUnconverted =
    school?.listingStatus === "listed_unconverted" ||
    (school as any)?.listing_status === "listed_unconverted";

  // If unconverted listing, track profile view
  if (school && isUnconverted) {
    await trackSchoolProfileView(school.id);
  }

  // Check if active tenant has active classes & terms configured
  let hasOnlineAdmissions = false;
  if (school && !isUnconverted) {
    const classRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(classes)
      .where(eq(classes.schoolId, school.id));
    const classCount = classRows[0]?.count || 0;

    const termRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(terms)
      .where(and(eq(terms.schoolId, school.id), eq(terms.isCurrent, true)));
    const termCount = termRows[0]?.count || 0;

    hasOnlineAdmissions = classCount > 0 && termCount > 0;
  }

  const schoolName = school?.name || `${slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Portal`;

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
              <p className="text-xs text-slate-400">
                {isUnconverted ? "Apexium School Directory Listing" : "Official School Gateway"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isUnconverted ? (
              <Link
                id="school-directory-claim-nav-btn"
                href={`/register?claimSlug=${slug}`}
                className="text-xs font-semibold px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Claim This School</span>
              </Link>
            ) : (
              <Link
                id="school-portal-login-btn"
                href={`/s/${slug}/auth/login`}
                className="text-xs font-semibold px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60 border border-slate-700/60 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Portal Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Section */}
      <main className="max-w-5xl mx-auto px-4 py-12 sm:py-20 relative z-10 w-full text-center flex-1 flex flex-col items-center justify-center">
        {isUnconverted ? (
          /* ── Case 1: Unconverted Directory Listing (Honest Profile, Zero Deceptive Application Forms) ── */
          <div className="w-full max-w-3xl text-left space-y-8 animate-in fade-in duration-200">
            {/* Pill */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Apexium Verified School Directory Profile</span>
              </div>
              <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {schoolName}
              </h2>
            </div>

            {/* Honest Notice Banner */}
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-7 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white">Online Application Status</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    This institution is listed in the national Apexium School Directory, but has not yet activated digital online applications through the Apexium portal.
                  </p>
                  <p className="text-xs text-slate-400">
                    To inquire about student enrollment, application forms, or on-campus entrance schedules, please reach out to the school directly using the verified contact details below.
                  </p>
                </div>
              </div>
            </div>

            {/* School Contact Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Direct Institution Contact Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-200">
                {school?.address && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <MapPin className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-slate-500 font-medium">Campus Address</div>
                      <div>{school.address}</div>
                      {(school.city || school.state) && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {[school.city, school.state].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {school?.email && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <Mail className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-slate-500 font-medium">Official Email</div>
                      <a href={`mailto:${school.email}`} className="text-indigo-300 hover:underline">
                        {school.email}
                      </a>
                    </div>
                  </div>
                )}

                {school?.phone && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <Phone className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-slate-500 font-medium">Phone Inquiry</div>
                      <a href={`tel:${school.phone}`} className="text-slate-200 hover:underline">
                        {school.phone}
                      </a>
                    </div>
                  </div>
                )}

                {school?.schoolType && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <SchoolIcon className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-slate-500 font-medium">Institution Type</div>
                      <div className="capitalize">{school.schoolType}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Growth Loop: Claim This School Card */}
            <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-6 sm:p-7 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-left">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Are you an administrator or proprietor of this school?</span>
                </div>
                <h4 className="text-base font-bold text-white">
                  Activate Your Full Apexium Portal &amp; Online Admissions
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                  Accept parent applications digitally, automate WAEC/NECO grade calculations, and generate PDF report cards in minutes.
                </p>
              </div>

              <Link
                id="school-claim-action-btn"
                href={`/register?claimSlug=${slug}`}
                className="shrink-0 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                <span>Claim This School →</span>
              </Link>
            </div>
          </div>
        ) : (
          /* ── Case 2: Active Tenant (Active ERP Portal) ── */
          <>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>
                {hasOnlineAdmissions ? "2026/2027 Academic Admissions Now Open" : "Apexium Certified Institution"}
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight max-w-3xl mx-auto leading-tight">
              Welcome to {schoolName}
            </h2>

            <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              {hasOnlineAdmissions
                ? "Submit prospective student applications, schedule entrance assessments, track status, and access the school management portal."
                : "Official school gateway for enrolled students, parents, teachers, and administrators."}
            </p>

            {/* Action Cards */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl text-left">
              {/* Card 1: Apply for Admission (Only if configured) */}
              {hasOnlineAdmissions ? (
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
                    id="school-apply-admission-btn"
                    href={`/s/${slug}/admissions`}
                    className="inline-flex items-center justify-center w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/25 gap-2"
                  >
                    <span>Start Application</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400 flex items-center justify-center mb-4">
                      <SchoolIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1.5">Campus Admissions</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6">
                      Admissions for this academic session are currently handled directly on campus.
                    </p>
                  </div>
                  <div className="text-xs text-slate-500 italic">Inquire with school administration</div>
                </div>
              )}

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
                  id="school-track-admission-btn"
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
                  id="school-portal-signin-card-btn"
                  href={`/s/${slug}/auth/login`}
                  className="inline-flex items-center justify-center w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl transition-all border border-slate-700 gap-2"
                >
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-600 relative z-10 border-t border-slate-800/60">
        Powered by Apexium ERP • Secure School Management Platform
      </footer>
    </div>
  );
}

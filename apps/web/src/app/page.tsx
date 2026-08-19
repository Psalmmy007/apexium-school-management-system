import Link from "next/link";
import Image from "next/image";
import {
  School,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  Users,
  WifiOff,
  FileCheck2,
  Coins,
  Download,
  CreditCard,
  ArrowRight,
  Check,
  Building2,
  Sparkles,
  Lock,
  Database,
  History,
  Activity,
} from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { SchoolFinder } from "@/components/public/SchoolFinder";
import { tokens } from "@/lib/design-system/tokens";

const FEATURE_TOUR_MODULES = [
  {
    step: "01/06",
    tag: "Student Information & Admissions",
    title: "Centralized Student Records with Auto-Generated Admission Numbers",
    description:
      "Auto-generates sequential, never-reused admission numbers (ADM-YYYY-NNNNNN), detects duplicate student applications across phone and email before enrollment, and permits unrestricted CSV and JSON data export at any time.",
    webImg: "/screenshots/sis_web.png",
    mobileImg: "/screenshots/sis_mobile.png",
    webCaption: "Admin SIS Roster & Enrollment Console",
    mobileCaption: "Parent & Student Mobile Profile",
    mechanisms: [
      "Auto-generated unique admission numbers",
      "Per-school duplicate detection by DOB & parent phone",
      "Unrestricted one-click CSV and JSON roster export",
    ],
  },
  {
    step: "02/06",
    tag: "Daily Attendance & Sync",
    title: "IndexedDB Offline Caching with Bidirectional Conflict Resolution",
    description:
      "Teachers record daily roll calls locally in browser IndexedDB storage when power or cellular connections fail. Changes automatically queue and synchronize to PostgreSQL upon reconnection with deterministic timestamp arbitration.",
    webImg: "/screenshots/attendance_web.png",
    mobileImg: "/screenshots/attendance_mobile.png",
    webCaption: "School-Wide Attendance Register",
    mobileCaption: "One-Tap Mobile Roll Call",
    mechanisms: [
      "Offline local IndexedDB record caching",
      "Bidirectional conflict resolution on reconnection",
      "Automatic absence threshold notification triggers",
    ],
  },
  {
    step: "03/06",
    tag: "Academic Grading Engine",
    title: "WAEC Standard Grade Calculation & Worker-Generated PDF Reports",
    description:
      "Converts raw scores to official WAEC/NECO grade scales (A1 to F9) with three-term cumulative weighting and affective domain scoring. PDF terminal report cards generate in background BullMQ worker queues to prevent request timeouts.",
    webImg: "/screenshots/grading_web.png",
    mobileImg: "/screenshots/grading_mobile.png",
    webCaption: "Academic Scoresheet & Position Ranking",
    mobileCaption: "Parent Digital Report Card View",
    mechanisms: [
      "A1 through F9 WAEC and NECO grade scale mapping",
      "Background PDF report compilation via BullMQ worker",
      "Tamper-evident verification and class position ranking",
    ],
  },
  {
    step: "04/06",
    tag: "Finance & Fee Collection",
    title: "Automated Invoicing, Overpayment Prevention & Paystack Settlement",
    description:
      "Generates itemized term fee schedules per class. Overpayments are programmatically rejected, full settlements automatically lock invoices against modification, and Paystack webhook signatures verify card, transfer, and USSD payments instantly.",
    webImg: "/screenshots/fees_web.png",
    mobileImg: "/screenshots/fees_mobile.png",
    webCaption: "Term Fee Ledger & Debtor Tracker",
    mobileCaption: "Paystack Mobile Checkout View",
    mechanisms: [
      "Overpayment blocked; full payment auto-locks the invoice",
      "Paystack webhook cryptographic signature verification",
      "Automated digital receipt generation per transaction",
    ],
  },
  {
    step: "05/06",
    tag: "Computer-Based Testing",
    title: "Randomized Question Delivery with Client-Side State Recovery",
    description:
      "Shuffles questions and answer options per student candidate to prevent exam malpractice. Active examination sessions save progress locally in real time so students resume instantly without timer resets if hardware reboots.",
    webImg: "/screenshots/cbt_web.png",
    mobileImg: "/screenshots/cbt_mobile.png",
    webCaption: "CBT Question Bank & Exam Scheduler",
    mobileCaption: "Student Timed CBT Exam Interface",
    mechanisms: [
      "Per-candidate question and option randomization",
      "Local state recovery on unexpected browser reload",
      "Instant automated grading with teacher analytics",
    ],
  },
  {
    step: "06/06",
    tag: "Multi-Branch Governance",
    title: "Consolidated Group Analytics with Per-School Data Isolation",
    description:
      "Allows school group proprietors to monitor enrollment, academic standing, and fee collection across multiple campuses from one dashboard, while every database record remains strictly partitioned by tenant ID.",
    webImg: "/screenshots/governance_web.png",
    mobileImg: "/screenshots/governance_mobile.png",
    webCaption: "Multi-Campus Consolidated Analytics",
    mobileCaption: "Branch Portal Switcher",
    mechanisms: [
      "Consolidated cross-campus performance metrics",
      "Subdomain tenant routing per branch institution",
      "Physical database partition by school ID foreign key",
    ],
  },
];

export default function HomePage() {
  return (
    <div className={tokens.pageContainer + " overflow-x-hidden"}>
      {/* ── 1. Responsive Header Navigation ──────────────────────────────────── */}
      <PublicHeader />

      {/* ── 2. Hero Section ───────────────────────────────────────────────────── */}
      <section className="pt-36 pb-16 sm:pt-44 sm:pb-24 lg:pt-48 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight max-w-5xl mx-auto leading-[1.2] sm:leading-[1.15]">
            School Management Software for Primary and Secondary Schools
          </h1>

          <p className="mt-6 sm:mt-8 text-base sm:text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Apexium provides complete offline-first operation, WAEC and NECO-aligned grade calculation, transparent Naira pricing, and unrestricted data export.
          </p>

          {/* Dual Action CTAs: Full ERP Registration vs Free Directory Listing */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 max-w-2xl sm:max-w-none mx-auto">
            <Link
              id="hero-primary-cta"
              href="/register"
              className={tokens.btnPrimaryLg + " w-full sm:w-auto min-h-[48px] py-4 px-7 shadow-lg shadow-indigo-600/20"}
            >
              <span>Register School (14-Day Trial)</span>
              <ArrowRight className="w-5 h-5 shrink-0" />
            </Link>

            <Link
              id="hero-list-school-cta"
              href="/list-school"
              className="w-full sm:w-auto min-h-[48px] py-4 px-6 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>List Your School / Get Found by Parents (Free)</span>
            </Link>

            <Link
              id="hero-secondary-cta"
              href="/pricing"
              className={tokens.btnSecondary + " w-full sm:w-auto min-h-[48px] py-4 px-6"}
            >
              <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Naira Plans</span>
            </Link>
          </div>

          {/* ── Directory: Find Your School Portal ───────────────────────────── */}
          <div className="mt-10 sm:mt-12 max-w-2xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Already enrolled or looking to apply to a specific school?
            </p>
            <SchoolFinder />
          </div>

          {/* ── Role-Based Entry Points Cards ─────────────────────────────────── */}
          <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto text-left">
            {/* Entry Point A: School Owners & Administrators */}
            <div className={tokens.card + " p-6 sm:p-7 flex flex-col justify-between"}>
              <div>
                <div className={tokens.iconBoxLarge + " mb-4"}>
                  <School className="w-6 h-6" />
                </div>
                <h3 className={tokens.h3 + " mb-2"}>School Owners & Administrators</h3>
                <p className={tokens.body + " mb-5"}>
                  Set up your academic structure, configure grading scales, enroll students, and manage fee billing. Setup takes under three minutes.
                </p>
              </div>
              <Link
                id="role-admin-register-link"
                href="/register"
                className="inline-flex items-center text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors gap-1.5 min-h-[44px]"
              >
                <span>Register Your School</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Entry Point B: Teachers, Parents & Students */}
            <div className={tokens.card + " p-6 sm:p-7 flex flex-col justify-between"}>
              <div>
                <div className={tokens.iconBoxLarge + " mb-4"}>
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className={tokens.h3 + " mb-2"}>Teachers, Parents & Students</h3>
                <p className={tokens.body + " mb-5"}>
                  Access your school portal to record attendance, enter term scores, inspect academic report cards, or make fee payments.
                </p>
              </div>
              <Link
                id="role-portal-login-link"
                href="/auth/login"
                className="inline-flex items-center text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors gap-1.5 min-h-[44px]"
              >
                <span>Sign In to School Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Live Demo Role Selection Section ─────────────────────────────── */}
      <section id="demo-preview" className="py-16 sm:py-20 bg-slate-900/50 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
            <h2 className={tokens.overline + " mb-2"}>
              Interactive Demonstrations
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Try Role-Based Portal Accounts
            </p>
            <p className={tokens.caption + " mt-2"}>
              Select any role below to sign in with pre-filled test credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-5xl mx-auto">
            <div className={tokens.card + " flex flex-col justify-between"}>
              <div>
                <div className={tokens.iconBoxNeutral + " mb-3"}>
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="font-bold text-white text-base">School Admin Demo</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Student enrollment, class assignments, fee schedules, and school settings.
                </p>
              </div>
              <Link
                href="/auth/login?demo=admin"
                className={tokens.btnSmallAction + " mt-6 min-h-[44px]"}
              >
                <span>Launch Admin Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className={tokens.card + " flex flex-col justify-between"}>
              <div>
                <div className={tokens.iconBoxNeutral + " mb-3"}>
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="font-bold text-white text-base">Teacher Portal Demo</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Class attendance registers, continuous assessment scores, and lesson plans.
                </p>
              </div>
              <Link
                href="/auth/login?demo=teacher"
                className={tokens.btnSmallAction + " mt-6 min-h-[44px]"}
              >
                <span>Launch Teacher Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className={tokens.card + " flex flex-col justify-between"}>
              <div>
                <div className={tokens.iconBoxNeutral + " mb-3"}>
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="font-bold text-white text-base">Parent Portal Demo</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Terminal report cards, daily attendance logs, and online fee payment.
                </p>
              </div>
              <Link
                href="/auth/login?demo=parent"
                className={tokens.btnSmallAction + " mt-6 min-h-[44px]"}
              >
                <span>Launch Parent Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className={tokens.card + " flex flex-col justify-between"}>
              <div>
                <div className={tokens.iconBoxNeutral + " mb-3"}>
                  <GraduationCap className="w-5 h-5 text-sky-400" />
                </div>
                <h3 className="font-bold text-white text-base">Student Portal Demo</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Daily schedules, online CBT tests, subject grades, and learning materials.
                </p>
              </div>
              <Link
                href="/auth/login?demo=student"
                className={tokens.btnSmallAction + " mt-6 min-h-[44px]"}
              >
                <span>Launch Student Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Architectural Highlights ───────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-20 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <h2 className={tokens.overline + " mb-2"}>
              Core Capabilities
            </h2>
            <p className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Built for African Infrastructure
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            <div className={tokens.card}>
              <div className={tokens.iconBoxNeutral + " mb-4"}>
                <WifiOff className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Offline-First Operation</h3>
              <p className={tokens.body}>
                Records data locally in browser IndexedDB storage when power or connectivity is unavailable, then synchronizes automatically with timestamp conflict resolution upon reconnection.
              </p>
            </div>

            <div className={tokens.card}>
              <div className={tokens.iconBoxNeutral + " mb-4"}>
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">WAEC & NECO Alignment</h3>
              <p className={tokens.body}>
                Standard grade scale conversions (A1 through F9), three-term cumulative grading, affective domain assessments, and background PDF generation via worker queues.
              </p>
            </div>

            <div className={tokens.card}>
              <div className={tokens.iconBoxNeutral + " mb-4"}>
                <Coins className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Published Naira Pricing</h3>
              <p className={tokens.body}>
                Transparent termly billing starting at ₦50,000 per term without foreign exchange fluctuation risk or mandatory annual contracts.
              </p>
            </div>

            <div className={tokens.card}>
              <div className={tokens.iconBoxNeutral + " mb-4"}>
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Free Data Export</h3>
              <p className={tokens.body}>
                Export your complete school database (student rosters, scores, fee records, audit logs) in CSV or JSON at any time with no export fee.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Product Feature Tour (Numbered Real Screenshots) ───────────────── */}
      <section id="proof" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
            <h2 className={tokens.overline + " mb-2"}>
              Product Tour
            </h2>
            <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              Real Interfaces Built for School Workflows
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Each module provides a desktop management console for staff and a focused mobile view for parents and students.
            </p>
          </div>

          <div className="space-y-16 sm:space-y-24">
            {FEATURE_TOUR_MODULES.map((mod, idx) => (
              <div
                key={mod.step}
                className="rounded-3xl bg-slate-900/70 border border-slate-800 p-6 sm:p-10 lg:p-12 shadow-xl"
              >
                {/* Module Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono text-xs font-bold">
                      {mod.step}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {mod.tag}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    Production Verified
                  </div>
                </div>

                {/* Module Description & Mechanisms */}
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-5 space-y-4">
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                      {mod.title}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {mod.description}
                    </p>

                    <div className="pt-4 space-y-2.5">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Technical Mechanisms
                      </div>
                      {mod.mechanisms.map((mech) => (
                        <div key={mech} className="flex items-start gap-2 text-xs text-slate-300">
                          <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <span>{mech}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Side-by-Side Screenshots (Web Desktop View + Mobile View) */}
                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    {/* Web Desktop View */}
                    <div className="sm:col-span-8 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg">
                      <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-300">
                          {mod.webCaption}
                        </span>
                        <div className="flex gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                          <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                          <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                        </div>
                      </div>
                      <div className="relative aspect-[16/10] bg-slate-950">
                        <Image
                          src={mod.webImg}
                          alt={mod.webCaption}
                          fill
                          loading="lazy"
                          className="object-cover object-top"
                          sizes="(max-width: 768px) 100vw, 450px"
                        />
                      </div>
                    </div>

                    {/* Mobile Companion View */}
                    <div className="sm:col-span-4 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg max-w-[200px] mx-auto sm:max-w-none w-full">
                      <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 text-center">
                        <span className="text-[10px] font-medium text-slate-400">
                          Mobile View
                        </span>
                      </div>
                      <div className="relative aspect-[9/16] bg-slate-950">
                        <Image
                          src={mod.mobileImg}
                          alt={mod.mobileCaption}
                          fill
                          loading="lazy"
                          className="object-cover object-top"
                          sizes="(max-width: 768px) 100vw, 200px"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Dedicated Trust & Security Section ────────────────────────────── */}
      <section id="security" className="py-20 bg-slate-900/40 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className={tokens.overline + " mb-2"}>
              Architecture & Compliance
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Enterprise Trust & Technical Guarantees
            </p>
            <p className="mt-3 text-slate-400 text-sm">
              Verified infrastructure guarantees protecting school records, grades, and student privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Guarantee 1: Strict Per-School Isolation */}
            <div className={tokens.card + " flex flex-col justify-between"}>
              <div>
                <div className={tokens.iconBoxNeutral + " mb-4"}>
                  <Database className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  Per-School Data Isolation
                </h3>
                <p className={tokens.body}>
                  Mandatory <code className="text-xs text-indigo-300">school_id</code> scoping enforced from the first migration across all tables and queries. Two schools never share or cross-access records.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Verified Schema Partition</span>
              </div>
            </div>

            {/* Guarantee 2: Immutable Audit Trail */}
            <div className={tokens.card + " flex flex-col justify-between"}>
              <div>
                <div className={tokens.iconBoxNeutral + " mb-4"}>
                  <History className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  Immutable Security Audit Trail
                </h3>
                <p className={tokens.body}>
                  Every score modification, grade publishing event, session promotion, fee invoice update, and role grant is logged with user identity, client IP, and diff snapshots.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Append-Only Audit Logs</span>
              </div>
            </div>

            {/* Guarantee 3: Encryption */}
            <div className={tokens.card + " flex flex-col justify-between"}>
              <div>
                <div className={tokens.iconBoxNeutral + " mb-4"}>
                  <Lock className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  Encryption in Transit & at Rest
                </h3>
                <p className={tokens.body}>
                  All HTTP traffic is secured via TLS 1.3 encryption. Primary PostgreSQL database storage and automated point-in-time backups are encrypted at rest with AES-256 standards.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>TLS 1.3 & AES-256</span>
              </div>
            </div>

            {/* Guarantee 4: Uptime & Offline Continuity */}
            <div className={tokens.card + " flex flex-col justify-between"}>
              <div>
                <div className={tokens.iconBoxNeutral + " mb-4"}>
                  <Activity className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  99.9% Target Availability
                </h3>
                <p className={tokens.body}>
                  Stateless application edge deployment with automated health diagnostics. Core attendance and grade entry continue locally during power or internet outages.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Health Monitoring & Offline</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Pricing Section ───────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <h2 className={tokens.overline + " mb-2"}>
              Subscription Plans
            </h2>
            <p className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Published Termly Rates in Naira
            </p>
            <p className="mt-3 text-slate-400 text-sm">
              All plans include core modules, free data export, and direct technical support.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className={tokens.card + " p-6 sm:p-8 flex flex-col justify-between"}>
              <div>
                <h3 className={tokens.h3}>Basic School Plan</h3>
                <p className="text-xs text-slate-400 mt-1">Up to 250 Students</p>
                <div className="mt-6 mb-6">
                  <span className="text-3xl sm:text-4xl font-black text-white">₦50,000</span>
                  <span className="text-xs text-slate-400"> / term</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Student Information System</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Daily Attendance & Timetable</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>WAEC / NECO Grade Scales</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Parent Portal & PDF Report Cards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Full CSV and JSON Data Export</span>
                  </li>
                </ul>
              </div>
              <Link
                id="pricing-starter-cta"
                href="/register?plan=starter"
                className="mt-8 text-center text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3.5 rounded-xl transition-all min-h-[44px] flex items-center justify-center"
              >
                Select Basic Plan
              </Link>
            </div>

            {/* Standard Plan */}
            <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-indigo-600/60 flex flex-col justify-between shadow-md relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                Recommended for Most Schools
              </div>
              <div>
                <h3 className={tokens.h3}>Standard School Plan</h3>
                <p className="text-xs text-indigo-300 mt-1">Up to 1,000 Students</p>
                <div className="mt-6 mb-6">
                  <span className="text-3xl sm:text-4xl font-black text-white">₦120,000</span>
                  <span className="text-xs text-slate-400"> / term</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>All Basic Plan Features</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Computer-Based Testing (CBT)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Paystack Online Fee Collection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Staff HR and Payroll Processing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Online Student Admissions Portal</span>
                  </li>
                </ul>
              </div>
              <Link
                id="pricing-standard-cta"
                href="/register?plan=standard"
                className={tokens.btnPrimary + " mt-8 py-3.5 rounded-xl min-h-[44px]"}
              >
                Select Standard Plan
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className={tokens.card + " p-6 sm:p-8 flex flex-col justify-between"}>
              <div>
                <h3 className={tokens.h3}>Multi-Branch Group</h3>
                <p className="text-xs text-slate-400 mt-1">Multiple Campuses</p>
                <div className="mt-6 mb-6">
                  <span className="text-3xl sm:text-4xl font-black text-white">₦250,000</span>
                  <span className="text-xs text-slate-400"> / term</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>All Standard Plan Features</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Multi-Branch Campus Management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Consolidated Group Analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Custom Subdomain Routing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Priority Technical Support</span>
                  </li>
                </ul>
              </div>
              <Link
                id="pricing-enterprise-cta"
                href="/register?plan=enterprise"
                className="mt-8 text-center text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3.5 rounded-xl transition-all min-h-[44px] flex items-center justify-center"
              >
                Select Group Plan
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Honest Early Onboarding Status ─────────────────────────────────── */}
      <section id="onboarding-status" className="py-16 sm:py-20 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-6 sm:p-10 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 mx-auto mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
              Now Onboarding Our First Schools
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl mx-auto mb-6">
              Apexium ERP is currently onboarding its initial cohort of primary and secondary schools. Register your school today to set up your institution with full technical onboarding support.
            </p>
            <Link
              href="/register"
              className={tokens.btnPrimary + " px-6 py-3.5 rounded-xl min-h-[44px]"}
            >
              <span>Begin School Registration</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 9. Footer (Strictly NO Superadmin / Platform Operator Links) ──────── */}
      <footer className={tokens.footer}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-300">Apexium ERP</span>
            <span>•</span>
            <span>School Management System</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link href="/register" className="hover:text-slate-300 transition-colors py-1">
              Register School
            </Link>
            <Link href="/pricing" className="hover:text-slate-300 transition-colors py-1">
              Pricing
            </Link>
            <Link href="/auth/login" className="hover:text-slate-300 transition-colors py-1">
              School Login
            </Link>
            <Link href="/dashboard/settings/privacy" className="hover:text-slate-300 transition-colors py-1">
              NDPR Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

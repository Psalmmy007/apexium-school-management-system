import Link from "next/link";
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
  Lock,
  Check,
  Building2,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* ── 1. Header Navigation ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/90 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
              <School className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Apexium<span className="text-indigo-400">ERP</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">
              Capabilities
            </a>
            <a href="#demo-preview" className="hover:text-white transition-colors">
              Product Demo
            </a>
            <a href="#proof" className="hover:text-white transition-colors">
              System Preview
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#onboarding-status" className="hover:text-white transition-colors">
              Admissions & Onboarding
            </a>
          </nav>

          <div className="flex items-center space-x-3">
            <Link
              id="nav-signin-link"
              href="/auth/login"
              className="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all flex items-center gap-2"
            >
              <Lock className="w-4 h-4 text-slate-400" />
              <span>School Login</span>
            </Link>

            {/* DOMINANT CTA */}
            <Link
              id="nav-register-link"
              href="/register"
              className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <span>Register School</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. Hero Section ───────────────────────────────────────────────────── */}
      <section className="pt-20 pb-20 lg:pt-28 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight max-w-5xl mx-auto leading-[1.15]">
            School Management Software for Primary and Secondary Schools
          </h1>

          <p className="mt-8 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Apexium provides complete offline-first operation, WAEC and NECO-aligned grade calculation, transparent Naira pricing, and unrestricted data export.
          </p>

          {/* Single Dominant Call-to-Action */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              id="hero-primary-cta"
              href="/register"
              className="w-full sm:w-auto text-center font-bold text-base text-white bg-indigo-600 hover:bg-indigo-500 px-8 py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Register Your School — 14-Day Trial</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              id="hero-secondary-cta"
              href="/pricing"
              className="w-full sm:w-auto text-center font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-6 py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span>View Naira Plans and Pricing</span>
            </Link>

            <a
              id="hero-demo-cta"
              href="#demo-preview"
              className="w-full sm:w-auto text-center font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-6 py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Try a Live Demo</span>
            </a>
          </div>

          {/* ── Role-Based Entry Points Cards ─────────────────────────────────── */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
            {/* Entry Point A: School Owners & Administrators */}
            <div className="p-7 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 mb-4">
                <School className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">School Owners & Administrators</h3>
              <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                Set up your academic structure, configure grading scales, enroll students, and manage fee billing. Setup takes under three minutes.
              </p>
              <Link
                id="role-admin-register-link"
                href="/register"
                className="inline-flex items-center text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors gap-1.5"
              >
                <span>Register Your School</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Entry Point B: Teachers, Parents & Students */}
            <div className="p-7 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 mb-4">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Teachers, Parents & Students</h3>
              <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                Access your school account to record attendance, enter term scores, inspect academic report cards, or make fee payments.
              </p>
              <Link
                id="role-portal-login-link"
                href="/auth/login"
                className="inline-flex items-center text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors gap-1.5"
              >
                <span>Sign In to Your School Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Live Demo Role Selection Section ─────────────────────────────── */}
      <section id="demo-preview" className="py-20 bg-slate-900/50 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Interactive Demonstrations
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              Try Role-Based Portal Accounts
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Select any role below to sign in with pre-filled test credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 mb-3">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">School Admin Demo</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Student enrollment, class assignments, fee schedules, and school settings.
                </p>
              </div>
              <Link
                href="/auth/login?demo=admin"
                className="mt-6 w-full text-center py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Launch Admin Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 mb-3">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Teacher Portal Demo</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Class attendance registers, continuous assessment scores, and lesson plans.
                </p>
              </div>
              <Link
                href="/auth/login?demo=teacher"
                className="mt-6 w-full text-center py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Launch Teacher Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400 mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Parent Portal Demo</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Terminal report cards, daily attendance logs, and online fee payment.
                </p>
              </div>
              <Link
                href="/auth/login?demo=parent"
                className="mt-6 w-full text-center py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Launch Parent Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-sky-400 mb-3">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Student Portal Demo</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Daily schedules, online CBT tests, subject grades, and learning materials.
                </p>
              </div>
              <Link
                href="/auth/login?demo=student"
                className="mt-6 w-full text-center py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Launch Student Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Architectural Highlights ───────────────────────────────────────── */}
      <section id="features" className="py-20 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Core Capabilities
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              Built for African Infrastructure
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 mb-4">
                <WifiOff className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Offline-First Operation</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Records data locally in browser storage when power or connectivity is unavailable, then synchronizes automatically when connection returns.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 mb-4">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">WAEC & NECO Alignment</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Standard grade scale conversions (A1 through F9), three-term cumulative grading, affective domain assessments, and automatic class position ranking.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 mb-4">
                <Coins className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Published Naira Pricing</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Transparent termly billing starting at ₦50,000 per term without foreign exchange fluctuation risk or mandatory annual contracts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 mb-4">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Free Data Export</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Export your complete school database (student rosters, scores, fee records, audit logs) in CSV or JSON at any time with no export fee.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Product Proof Section (Clean Samples) ─────────────────────────── */}
      <section id="proof" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              System Interface Preview
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              Application Modules & Live Outputs
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Note: Metrics shown below represent illustrative sample data from our automated test environment.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Proof Card 1: Core ERP Dashboard */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-md">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400">Core ERP Overview</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  Sample Data
                </span>
              </div>
              <div className="p-6 space-y-4 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase">Enrolled Students (Sample)</div>
                  <div className="text-lg font-bold text-white mt-1">1,248 Students</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase">Daily Attendance (Sample)</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">96.4% Recorded</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase">Fee Collection (Sample)</div>
                  <div className="text-lg font-bold text-indigo-300 mt-1">₦18,450,000 Processed</div>
                </div>
              </div>
            </div>

            {/* Proof Card 2: Parent Portal & Online Payments */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-md">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Parent & Guardian View</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  Paystack Integrated
                </span>
              </div>
              <div className="p-6 space-y-4 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase">Student Profile (Sample)</div>
                  <div className="text-sm font-bold text-white mt-1">Chidi Okeke — JSS 2 Gold</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase">Outstanding Term Fee</div>
                  <div className="text-lg font-bold text-amber-400 mt-1">₦45,000.00</div>
                  <div className="mt-2 text-[10px] text-emerald-400 font-sans font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Paystack Debit Card and USSD Supported</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Proof Card 3: Terminal Report Card Generator */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-md">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">WAEC Grade Calculation</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  PDF Generation
                </span>
              </div>
              <div className="p-6 space-y-3 font-mono text-[11px]">
                <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">Mathematics</span>
                  <span className="font-bold text-emerald-400">88% (A1 Distinction)</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">English Language</span>
                  <span className="font-bold text-emerald-400">79% (A1 Distinction)</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">Basic Science</span>
                  <span className="font-bold text-indigo-300">72% (B2 Very Good)</span>
                </div>
                <div className="p-2 text-[10px] text-slate-400 text-center font-sans border-t border-slate-800 mt-2">
                  Class Position Ranking + QR Code Verification
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Pricing Section ───────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-slate-900/40 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Subscription Plans
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              Published Termly Rates in Naira
            </p>
            <p className="mt-3 text-slate-400 text-sm">
              All plans include core modules, free data export, and direct technical support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-white">Basic School Plan</h3>
                <p className="text-xs text-slate-400 mt-1">Up to 250 Students</p>
                <div className="mt-6 mb-6">
                  <span className="text-4xl font-black text-white">₦50,000</span>
                  <span className="text-xs text-slate-400"> / term</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Student Information System</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Daily Attendance & Timetable</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                    <span>WAEC / NECO Grade Scales</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Parent Portal & PDF Report Cards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Full CSV and JSON Data Export</span>
                  </li>
                </ul>
              </div>
              <Link
                id="pricing-starter-cta"
                href="/register?plan=starter"
                className="mt-8 text-center text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3 rounded-xl transition-all"
              >
                Select Basic Plan
              </Link>
            </div>

            {/* Standard Plan */}
            <div className="p-8 rounded-2xl bg-slate-900 border border-indigo-600/60 flex flex-col justify-between shadow-md relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider">
                Recommended for Most Schools
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Standard School Plan</h3>
                <p className="text-xs text-indigo-300 mt-1">Up to 1,000 Students</p>
                <div className="mt-6 mb-6">
                  <span className="text-4xl font-black text-white">₦120,000</span>
                  <span className="text-xs text-slate-400"> / term</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                    <span>All Basic Plan Features</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Computer-Based Testing (CBT)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Paystack Online Fee Collection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Staff HR and Payroll Processing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Online Student Admissions Portal</span>
                  </li>
                </ul>
              </div>
              <Link
                id="pricing-standard-cta"
                href="/register?plan=standard"
                className="mt-8 text-center text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl shadow-md transition-all"
              >
                Select Standard Plan
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-white">Multi-Branch Group</h3>
                <p className="text-xs text-slate-400 mt-1">Multiple Campuses</p>
                <div className="mt-6 mb-6">
                  <span className="text-4xl font-black text-white">₦250,000</span>
                  <span className="text-xs text-slate-400"> / term</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                    <span>All Standard Plan Features</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Multi-Branch Campus Management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Consolidated Group Analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Custom Subdomain Routing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Priority Technical Support</span>
                  </li>
                </ul>
              </div>
              <Link
                id="pricing-enterprise-cta"
                href="/register?plan=enterprise"
                className="mt-8 text-center text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3 rounded-xl transition-all"
              >
                Select Group Plan
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Honest Early Onboarding Status ─────────────────────────────────── */}
      <section id="onboarding-status" className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-8 sm:p-10 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
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
              className="inline-flex items-center font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl shadow-md transition-all gap-2"
            >
              <span>Begin School Registration</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 8. Footer (Strictly NO Superadmin / Platform Operator Links) ──────── */}
      <footer className="py-12 bg-slate-950 border-t border-slate-900 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-300">Apexium ERP</span>
            <span>—</span>
            <span>School Management System</span>
          </div>

          <div className="flex items-center space-x-6">
            <Link href="/register" className="hover:text-slate-300 transition-colors">
              Register School
            </Link>
            <Link href="/pricing" className="hover:text-slate-300 transition-colors">
              Pricing
            </Link>
            <Link href="/auth/login" className="hover:text-slate-300 transition-colors">
              School Login
            </Link>
            <Link href="/dashboard/settings/privacy" className="hover:text-slate-300 transition-colors">
              NDPR Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

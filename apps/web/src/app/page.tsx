import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased">
      {/* ── 1. Header Navigation ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">Apexium<span className="text-indigo-400">ERP</span></span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#proof" className="hover:text-white transition-colors">Product Proof</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Schools</a>
          </nav>

          <div className="flex items-center space-x-3">
            <Link
              id="nav-signin-link"
              href="/auth/login"
              className="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all"
            >
              🔑 School Login
            </Link>

            {/* DOMINANT CTA */}
            <Link
              id="nav-register-link"
              href="/register"
              className="text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-0.5"
            >
              🚀 Register School
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. Hero Section ───────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.2),rgba(255,255,255,0))]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-8">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span>Built specifically for Primary & Secondary Schools in West Africa</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight max-w-5xl mx-auto leading-[1.1]">
            Modern School Management Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200">African Excellence</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Empower your school with <strong className="text-white">offline-first reliability</strong>, <strong className="text-white">WAEC/NECO-aligned grading</strong>, transparent Naira pricing, and complete <strong className="text-white">free data export with zero lock-in</strong>.
          </p>

          {/* Single Dominant Call-to-Action */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              id="hero-primary-cta"
              href="/register"
              className="w-full sm:w-auto text-center font-extrabold text-lg text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/35 hover:shadow-indigo-500/50 transition-all transform hover:-translate-y-1"
            >
              🚀 Register Your School Free — 14-Day Trial
            </Link>
            
            <Link
              id="hero-secondary-cta"
              href="/pricing"
              className="w-full sm:w-auto text-center font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 px-6 py-4 rounded-2xl transition-all"
            >
              💳 View Naira Plans & Pricing
            </Link>

            <a
              id="hero-demo-cta"
              href="#demo-showcase"
              className="w-full sm:w-auto text-center font-semibold text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/80 px-6 py-4 rounded-2xl transition-all"
            >
              ✨ Try a Live Demo
            </a>
          </div>

          {/* ── Role-Based Entry Points Cards ─────────────────────────────────── */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
            {/* Entry Point A: School Owners & Administrators */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all group shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                🏫
              </div>
              <h3 className="text-lg font-bold text-white mb-2">School Owners & Administrators</h3>
              <p className="text-sm text-slate-400 mb-4">
                Looking to digitize your school? Register your school in under 3 minutes. Includes Student SIS, Attendance, Grading, Finance, and Parent Portal.
              </p>
              <Link
                id="role-admin-register-link"
                href="/register"
                className="inline-flex items-center text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Register Your School →
              </Link>
            </div>

            {/* Entry Point B: Teachers, Parents & Students */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-all group shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                🎓
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Teachers, Parents & Students</h3>
              <p className="text-sm text-slate-400 mb-4">
                Does your school already use Apexium ERP? Log in to view report cards, pay fees, track attendance, or enter termly class assessment scores.
              </p>
              <Link
                id="role-portal-login-link"
                href="/auth/login"
                className="inline-flex items-center text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors"
              >
                Sign In to Your School Portal →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Demo Role Showcase Section ─────────────────────────────────── */}
      <section id="demo-showcase" className="py-16 bg-slate-900/60 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Interactive Product Demonstration</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">Experience Apexium ERP Roles Live</p>
            <p className="text-sm text-slate-400 mt-2">Explore pre-configured demo account profiles across administrative and portal user roles.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-2xl mb-2">🛡️</div>
                <h3 className="font-bold text-white text-base">School Admin Demo</h3>
                <p className="text-xs text-slate-400 mt-1">Full management of students, teachers, fees, setup, and school configuration.</p>
              </div>
              <Link
                href="/auth/login"
                className="mt-4 w-full text-center py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold border border-indigo-500/30 transition-all"
              >
                Launch Admin Demo →
              </Link>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-2xl mb-2">👨‍🏫</div>
                <h3 className="font-bold text-white text-base">Teacher Portal Demo</h3>
                <p className="text-xs text-slate-400 mt-1">Attendance entry, Continuous Assessment (CA) scores, and lesson note management.</p>
              </div>
              <Link
                href="/auth/login"
                className="mt-4 w-full text-center py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all"
              >
                Launch Teacher Demo →
              </Link>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-2xl mb-2">👨‍👩‍👧</div>
                <h3 className="font-bold text-white text-base">Parent Portal Demo</h3>
                <p className="text-xs text-slate-400 mt-1">View child report cards, attendance calendar, and online fee payment portal.</p>
              </div>
              <Link
                href="/auth/login"
                className="mt-4 w-full text-center py-2 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all"
              >
                Launch Parent Demo →
              </Link>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-2xl mb-2">🎓</div>
                <h3 className="font-bold text-white text-base">Student Portal Demo</h3>
                <p className="text-xs text-slate-400 mt-1">Check timetable, online CBT exams, academic progress, and study materials.</p>
              </div>
              <Link
                href="/auth/login"
                className="mt-4 w-full text-center py-2 px-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-bold border border-sky-500/30 transition-all"
              >
                Launch Student Demo →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Feature Highlights / Differentiators ──────────────────────────── */}
      <section id="features" className="py-20 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Why African Schools Choose Apexium</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">Engineered for Local Challenges, Built to International Standards</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 shadow-md">
              <div className="text-3xl mb-4">🔌</div>
              <h3 className="text-base font-bold text-white mb-2">Offline-First Resilience</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Works seamlessly in the browser even when network signals or power drops. Local RxDB storage syncs automatically when internet returns.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 shadow-md">
              <div className="text-3xl mb-4">📜</div>
              <h3 className="text-base font-bold text-white mb-2">WAEC & NECO Aligned</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Native support for 1st, 2nd, and 3rd term cumulative result compilation, WAEC grade scales (A1-F9), affective domain ratings, and automatic class position ranking.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 shadow-md">
              <div className="text-3xl mb-4">🇳🇬</div>
              <h3 className="text-base font-bold text-white mb-2">Transparent Naira Pricing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                No USD exchange rate surprises or foreign currency fees. Published termly Naira pricing starting at ₦50,000/term per school with optional Paystack payment.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 shadow-md">
              <div className="text-3xl mb-4">🔓</div>
              <h3 className="text-base font-bold text-white mb-2">Free Data Export (Zero Lock-In)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Full self-service NDPR data portability. School owners can download their entire database (students, grades, financial audit logs) at any time with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Product Proof Section (Built Product Showcase) ────────────────── */}
      <section id="proof" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Product Proof</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">Real Built Software, Not Stock Photography</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Proof Card 1: Core ERP Dashboard */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 uppercase">Core ERP Dashboard</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">Live Demo</span>
              </div>
              <div className="p-6 space-y-4 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">TOTAL ENROLLED STUDENTS</div>
                  <div className="text-xl font-bold text-white mt-1">1,248 Students</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">DAILY ATTENDANCE RATE</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">96.4% Present Today</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">FEE COLLECTION STATUS</div>
                  <div className="text-xl font-bold text-indigo-400 mt-1">₦18,450,000 Collected</div>
                </div>
              </div>
            </div>

            {/* Proof Card 2: Parent Portal & Online Payments */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 uppercase">Parent & Guardian Portal</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono">Paystack Ready</span>
              </div>
              <div className="p-6 space-y-4 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">STUDENT PROFILE</div>
                  <div className="text-sm font-bold text-white mt-1">Chidi Okeke — JSS 2 Gold</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">OUTSTANDING TERM FEE</div>
                  <div className="text-lg font-bold text-amber-400 mt-1">₦45,000.00</div>
                  <div className="mt-2 text-[10px] text-emerald-400 font-sans font-semibold">✓ Paystack Debit Card / USSD Online</div>
                </div>
              </div>
            </div>

            {/* Proof Card 3: Terminal Report Card Generator */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase">WAEC Report Card Engine</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">PDF Export</span>
              </div>
              <div className="p-6 space-y-3 font-mono text-[11px]">
                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">Mathematics</span>
                  <span className="font-bold text-emerald-400">88% (A1 Distinction)</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">English Language</span>
                  <span className="font-bold text-emerald-400">79% (A1 Distinction)</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">Basic Science</span>
                  <span className="font-bold text-indigo-400">72% (B2 Very Good)</span>
                </div>
                <div className="p-2 text-[10px] text-slate-400 text-center font-sans border-t border-slate-800 mt-2">
                  Automatic Class Position Ranking + QR Code Verification
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Visible Pricing Section ───────────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Transparent Naira Pricing</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">No Hidden Fees. Published Rates in Naira.</p>
            <p className="mt-3 text-slate-400 text-sm">All plans include full features, free data export, and 24/7 priority support.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Basic School</h3>
                <p className="text-xs text-slate-400 mt-1">Up to 250 Students</p>
                <div className="mt-6 mb-6">
                  <span className="text-4xl font-black text-white">₦50,000</span>
                  <span className="text-xs text-slate-400"> / term</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center"><span className="text-indigo-400 mr-2">✓</span> Student SIS & Guardian Registry</li>
                  <li className="flex items-center"><span className="text-indigo-400 mr-2">✓</span> Daily Attendance & Timetable</li>
                  <li className="flex items-center"><span className="text-indigo-400 mr-2">✓</span> WAEC/NECO Grade Scales</li>
                  <li className="flex items-center"><span className="text-indigo-400 mr-2">✓</span> Parent Portal & PDF Report Cards</li>
                  <li className="flex items-center"><span className="text-indigo-400 mr-2">✓</span> Free JSON/CSV Data Export</li>
                </ul>
              </div>
              <Link
                id="pricing-starter-cta"
                href="/register?plan=starter"
                className="mt-8 text-center text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 py-3 rounded-xl transition-all"
              >
                Select Starter Plan
              </Link>
            </div>

            {/* Standard Plan (Featured) */}
            <div className="p-8 rounded-2xl bg-slate-900 border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 flex flex-col justify-between relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider">
                Most Popular
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Standard School</h3>
                <p className="text-xs text-indigo-300 mt-1">Up to 1,000 Students</p>
                <div className="mt-6 mb-6">
                  <span className="text-4xl font-black text-white">₦120,000</span>
                  <span className="text-xs text-slate-400"> / term</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center"><span className="text-indigo-400 mr-2">✓</span> Everything in Basic Plan</li>
                  <li className="flex items-center"><span className="text-indigo-400 mr-2">✓</span> CBT Online Exam Engine</li>
                  <li className="flex items-center"><span className="text-indigo-400 mr-2">✓</span> Paystack Fee Collection</li>
                  <li className="flex items-center"><span className="text-indigo-400 mr-2">✓</span> HR & Payroll Management</li>
                  <li className="flex items-center"><span className="text-indigo-400 mr-2">✓</span> Public Online Admissions Portal</li>
                </ul>
              </div>
              <Link
                id="pricing-standard-cta"
                href="/register?plan=standard"
                className="mt-8 text-center text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
              >
                Select Standard Plan
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Multi-Branch Group</h3>
                <p className="text-xs text-slate-400 mt-1">Unlimited Students & Campuses</p>
                <div className="mt-6 mb-6">
                  <span className="text-4xl font-black text-white">₦250,000</span>
                  <span className="text-xs text-slate-400"> / term</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center"><span className="text-indigo-400 mr-2">✓</span> Everything in Standard Plan</li>
                  <li className="flex items-center"><span className="text-indigo-400 mr-2">✓</span> Multi-Branch Group Governance</li>
                  <li className="flex items-center"><span className="text-indigo-400 mr-2">✓</span> School Group Consolidated Analytics</li>
                  <li className="flex items-center"><span className="text-indigo-400 mr-2">✓</span> Custom Domain & Branding</li>
                  <li className="flex items-center"><span className="text-indigo-400 mr-2">✓</span> Dedicated Account Manager</li>
                </ul>
              </div>
              <Link
                id="pricing-enterprise-cta"
                href="/register?plan=enterprise"
                className="mt-8 text-center text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 py-3 rounded-xl transition-all"
              >
                Select Group Plan
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Structural Social Proof / Testimonials Placeholder ─────────────── */}
      <section id="testimonials" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Trusted By Forward-Thinking Educational Institutions</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-300 italic mb-4">
                &ldquo;The offline-first feature saved us during examination week when our Internet service went down. Teachers kept working without losing a single grade score.&rdquo;
              </p>
              <div className="text-xs font-bold text-white">Proprietor</div>
              <div className="text-[10px] text-slate-400">Grace International Schools, Lagos</div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-300 italic mb-4">
                &ldquo;Parents love the instant Paystack fee payment and digital report cards. Fee collection improved by over 40% in our very first term.&rdquo;
              </p>
              <div className="text-xs font-bold text-white">School Administrator</div>
              <div className="text-[10px] text-slate-400">Apex College, Abuja</div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-300 italic mb-4">
                &ldquo;Knowing we can export our entire school dataset at any time gives us total peace of mind. Apexium truly respects school data ownership.&rdquo;
              </p>
              <div className="text-xs font-bold text-white">Head of ICT</div>
              <div className="text-[10px] text-slate-400">St. Mary Academy, Ibadan</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Footer (Strictly NO Superadmin / Platform Operator Links) ──────── */}
      <footer className="py-12 bg-slate-950 border-t border-slate-900 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-300">Apexium ERP</span>
            <span>—</span>
            <span>Multi-Tenant School Management & SaaS Platform</span>
          </div>

          <div className="flex items-center space-x-6">
            <Link href="/register" className="hover:text-slate-300 transition-colors">Register School</Link>
            <Link href="/pricing" className="hover:text-slate-300 transition-colors">Pricing</Link>
            <Link href="/auth/login" className="hover:text-slate-300 transition-colors">School Login</Link>
            <Link href="/dashboard/settings/privacy" className="hover:text-slate-300 transition-colors">NDPR Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-950 via-brand-800 to-brand-600 p-6">
      <div className="text-center animate-slide-up max-w-lg">
        {/* Logo / Brand */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-elevation-3 mb-6">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            Apexium ERP
          </h1>
          <p className="text-brand-200 text-lg">
            Modern School Management System
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            id="register-school-link"
            href="/register"
            className="btn-primary bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 px-6 py-3 rounded-xl font-bold transition"
          >
            🚀 Register New School
          </Link>

          <Link
            id="pricing-link"
            href="/pricing"
            className="btn-secondary bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-xl font-semibold backdrop-blur-sm transition"
          >
            💳 View Plans & Pricing
          </Link>

          <Link
            id="sign-in-link"
            href="/auth/login"
            className="btn-primary bg-white text-brand-700 hover:bg-brand-50 px-6 py-3 rounded-xl font-semibold shadow-elevation-2 transition"
          >
            🔑 Sign In to Portal
          </Link>
        </div>

        {/* Platform Operator Access */}
        <div className="mt-6">
          <Link
            href="/platform"
            className="inline-flex items-center space-x-2 text-xs text-brand-200 hover:text-white bg-white/5 border border-white/10 px-4 py-2 rounded-lg backdrop-blur-sm transition"
          >
            <span>🌐 SaaS Platform Operator Dashboard</span>
            <span>→</span>
          </Link>
        </div>

        <p className="mt-8 text-brand-300 text-sm">
          Apexium Multi-Tenant School ERP & SaaS Platform.
        </p>
      </div>
    </main>
  );
}

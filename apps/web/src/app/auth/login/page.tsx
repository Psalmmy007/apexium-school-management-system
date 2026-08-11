"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md animate-slide-up">
      {/* Mobile logo */}
      <div className="flex items-center gap-2 mb-8 lg:hidden">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-white"
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
        <span className="font-bold text-lg text-brand-900">Apexium ERP</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
      <p className="text-slate-500 text-sm mb-8">
        Sign in to your school account to continue.
      </p>

      <form id="login-form" onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className="label">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="you@yourschool.edu"
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div
            id="login-error"
            role="alert"
            className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 0v4a4 4 0 100 8v4z"
                />
              </svg>
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {/* Demo Credentials Quick Fill Section */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
          Demo Portals Quick Fill
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setEmail("admin@apexium.edu");
              setPassword("DemoAdmin123!");
            }}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
          >
            🛡️ Demo Admin
          </button>

          <button
            type="button"
            onClick={() => {
              setEmail("teacher@apexium.edu");
              setPassword("DemoTeacher123!");
            }}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            👨‍🏫 Demo Teacher
          </button>

          <button
            type="button"
            onClick={() => {
              setEmail("parent@apexium.edu");
              setPassword("DemoParent123!");
            }}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
          >
            👨‍👩‍👧 Demo Parent
          </button>

          <button
            type="button"
            onClick={() => {
              setEmail("student@apexium.edu");
              setPassword("DemoStudent123!");
            }}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
          >
            🎓 Demo Student
          </button>
        </div>
      </div>

      {/* SaaS Registration & Navigation Links */}
      <div className="mt-6 p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-2 text-center text-xs">
        <p className="font-semibold text-slate-700">Want to create a new school tenant on Apexium SaaS?</p>
        <div className="flex justify-center space-x-3">
          <a href="/register" className="font-bold text-indigo-600 hover:text-indigo-800 underline">
            🚀 Register School Tenant
          </a>
          <span className="text-slate-300">•</span>
          <a href="/pricing" className="font-bold text-indigo-600 hover:text-indigo-800 underline">
            💳 Subscription Plans
          </a>
          <span className="text-slate-300">•</span>
          <a href="/platform" className="font-bold text-purple-600 hover:text-purple-800 underline">
            🌐 Platform Admin
          </a>
        </div>
      </div>

      {/* Direct Module Quick Shortcuts for Verification */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">
          Enterprise ERP Module Quick Access
        </p>
        <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-semibold">
          <a href="/dashboard/inventory" className="p-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700">
            📦 Inventory
          </a>
          <a href="/dashboard/settings/data-export" className="p-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700">
            💾 Data Export
          </a>
          <a href="/dashboard/group" className="p-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700">
            🏢 Multi-Branch
          </a>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have a school account? Sign in above or contact your school administrator.
      </p>
    </div>
  );
}

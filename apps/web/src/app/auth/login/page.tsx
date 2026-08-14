"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { School, AlertCircle, Sparkles, ArrowRight, ChevronDown } from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const demoRole = searchParams.get("demo");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  useEffect(() => {
    if (demoRole === "admin") {
      setEmail("admin@apexium.edu");
      setPassword("DemoAdmin123!");
      setDemoNotice("Pre-filled demo credentials for School Administrator. Click Sign In below.");
    } else if (demoRole === "teacher") {
      setEmail("teacher@apexium.edu");
      setPassword("DemoTeacher123!");
      setDemoNotice("Pre-filled demo credentials for Teacher Portal. Click Sign In below.");
    } else if (demoRole === "parent") {
      setEmail("parent@apexium.edu");
      setPassword("DemoParent123!");
      setDemoNotice("Pre-filled demo credentials for Parent Portal. Click Sign In below.");
    } else if (demoRole === "student") {
      setEmail("student@apexium.edu");
      setPassword("DemoStudent123!");
      setDemoNotice("Pre-filled demo credentials for Student Portal. Click Sign In below.");
    }
  }, [demoRole]);

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
      {/* Mobile Brand Header */}
      <div className="flex items-center gap-3 mb-8 lg:hidden">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
          <School className="w-5 h-5 text-white" />
        </div>
        <span className="font-extrabold text-xl text-slate-900 tracking-tight">
          Apexium<span className="text-indigo-600">ERP</span>
        </span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Welcome back</h1>
      <p className="text-slate-500 text-sm mb-8">
        Sign in to your school account to continue.
      </p>

      {demoNotice && (
        <div
          id="demo-banner"
          className="mb-6 p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-800 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{demoNotice}</span>
        </div>
      )}

      {/* Clean Single-Purpose Login Form */}
      <form id="login-form" onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 text-sm transition-all"
            placeholder="you@yourschool.edu"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Password
            </label>
            <a href="#forgot-password" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
              Forgot password?
            </a>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 text-sm transition-all"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div
            id="login-error"
            role="alert"
            className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 font-medium flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-all text-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
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
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* School Subdomain Portal Lookup (Helpful helper for multi-tenant schools) */}
      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <details className="group text-xs text-slate-500">
          <summary className="cursor-pointer font-medium hover:text-indigo-600 transition-colors list-none flex items-center justify-center gap-1.5">
            <School className="w-3.5 h-3.5 text-slate-400" />
            <span>Have a custom school portal URL?</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-2">
            <p className="text-[11px] text-slate-500">
              If your school has a dedicated Apexium portal (e.g., <code>schoolname.apexium.app</code> or <code>/s/schoolname</code>), you can enter your school code below to navigate there directly:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                id="school-slug-input"
                placeholder="school-code (e.g. stjude)"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = (e.currentTarget.value || "").trim().toLowerCase();
                    if (val) router.push(`/s/${val}/auth/login`);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById("school-slug-input") as HTMLInputElement;
                  const val = (input?.value || "").trim().toLowerCase();
                  if (val) router.push(`/s/${val}/auth/login`);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
              >
                Go
              </button>
            </div>
          </div>
        </details>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Apexium School ERP • Multi-Tenant Enterprise Education System
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading authentication portal...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}

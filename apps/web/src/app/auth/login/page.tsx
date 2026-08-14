"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { School, AlertCircle, Sparkles, ArrowRight, ChevronDown } from "lucide-react";
import { BrandLogo } from "@/components/public/BrandLogo";
import { tokens } from "@/lib/design-system/tokens";

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
    <div className={tokens.authCard}>
      {/* Mobile Brand Header */}
      <div className="flex items-center gap-3 mb-8 lg:hidden">
        <BrandLogo />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">Welcome back</h1>
      <p className="text-slate-400 text-sm mb-8">
        Sign in to your school account to continue.
      </p>

      {demoNotice && (
        <div
          id="demo-banner"
          className={tokens.bannerNotice + " mb-6"}
        >
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{demoNotice}</span>
        </div>
      )}

      {/* Clean Single-Purpose Login Form */}
      <form id="login-form" onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className={tokens.label}>
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
            className={tokens.input}
            placeholder="you@yourschool.edu"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className={tokens.label + " mb-0"}>
              Password
            </label>
            <a href="#forgot-password" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
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
            className={tokens.input}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div
            id="login-error"
            role="alert"
            className={tokens.bannerError}
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className={tokens.btnPrimary + " w-full py-4"}
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
      <div className="mt-8 pt-6 border-t border-slate-800 text-center">
        <details className="group text-xs text-slate-400">
          <summary className="cursor-pointer font-medium hover:text-indigo-400 transition-colors list-none flex items-center justify-center gap-1.5">
            <School className="w-3.5 h-3.5 text-slate-400" />
            <span>Have a custom school portal URL?</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="mt-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-left space-y-2">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              If your school has a dedicated Apexium portal (e.g., <code>schoolname.apexium.app</code> or <code>/s/schoolname</code>), you can enter your school code below to navigate there directly:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                id="school-slug-input"
                placeholder="school-code (e.g. stjude)"
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
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
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition border border-slate-700"
              >
                Go
              </button>
            </div>
          </div>
        </details>
      </div>

      <p className="mt-6 text-center text-[11px] text-slate-500">
        Apexium ERP • Multi-Tenant School Management Platform
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading authentication portal...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}

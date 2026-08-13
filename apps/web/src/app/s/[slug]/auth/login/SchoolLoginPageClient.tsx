"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface SchoolInfo {
  id: string;
  name: string;
  slug: string;
  motto?: string;
  address?: string;
  phone?: string;
}

export default function SchoolLoginPageClient({ school }: { school: SchoolInfo }) {
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
    <div className="w-full max-w-md animate-slide-up space-y-6">
      {/* School Branded Header */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-md">
            🏫
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight text-white">{school.name}</h1>
            <p className="text-xs text-indigo-300 font-medium">{school.motto}</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 mt-2">
          📍 {school.address} • 📞 {school.phone}
        </p>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Portal Login</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sign in to access your {school.name} dashboard.
          </p>
        </div>

        <form id="school-login-form" onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label htmlFor="email" className="block text-slate-700 font-bold mb-1">
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-900 text-sm transition-all"
              placeholder="user@school.edu.ng"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-slate-700 font-bold">
                Password
              </label>
              <a href="#forgot-password" className="text-indigo-600 hover:underline font-semibold text-[11px]">
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-900 text-sm transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              id="login-error"
              role="alert"
              className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium"
            >
              ⚠️ {error}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center text-sm"
          >
            {loading ? "Signing in..." : `Sign In to ${school.name}`}
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400 border-t border-slate-100 pt-3">
          Powered by Apexium ERP • Secure Portal Session
        </p>
      </div>
    </div>
  );
}

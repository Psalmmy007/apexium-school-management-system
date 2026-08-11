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
              className="input"
              placeholder="user@school.edu.ng"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-slate-700 font-bold mb-1">
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
              className="input"
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
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
          >
            {loading ? "Signing in..." : `Sign In to ${school.name}`}
          </button>
        </form>

        {/* Demo Credentials Quick Fill */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center">
            Demo Portal Sign In Options
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setEmail("admin@apexium.edu");
                setPassword("DemoAdmin123!");
              }}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold border border-indigo-200 transition"
            >
              🛡️ Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("teacher@apexium.edu");
                setPassword("DemoTeacher123!");
              }}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold border border-emerald-200 transition"
            >
              👨‍🏫 Teacher
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("parent@apexium.edu");
                setPassword("DemoParent123!");
              }}
              className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold border border-amber-200 transition"
            >
              👨‍👩‍👧 Parent
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("student@apexium.edu");
                setPassword("DemoStudent123!");
              }}
              className="px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold border border-sky-200 transition"
            >
              🎓 Student
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

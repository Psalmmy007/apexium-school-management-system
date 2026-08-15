"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { School, MapPin, Phone, AlertCircle, ArrowRight } from "lucide-react";
import { BackNavigation } from "@/components/ui/BackNavigation";
import { ActionButton } from "@/components/ui/ActionButton";
import { PasswordField } from "@/components/ui/PasswordField";

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
      <BackNavigation href={`/s/${school.slug}/admissions`} label="Back to Admissions" />

      {/* School Branded Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-md">
            <School className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight text-white">{school.name}</h1>
            {school.motto && <p className="text-xs text-indigo-300 font-medium">{school.motto}</p>}
          </div>
        </div>
        {(school.address || school.phone) && (
          <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 mt-2 flex flex-wrap items-center gap-3">
            {school.address && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span>{school.address}</span>
              </span>
            )}
            {school.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-500" />
                <span>{school.phone}</span>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 text-sm transition-all"
              placeholder="user@school.edu.ng"
            />
          </div>

          <div>
            <PasswordField
              id="password"
              name="password"
              label="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              showRequirements={false}
            />
            <div className="flex justify-end mt-1">
              <a href="#forgot-password" className="text-indigo-400 hover:text-indigo-300 font-semibold text-[11px]">
                Forgot password?
              </a>
            </div>
          </div>

          {error && (
            <div
              id="login-error"
              role="alert"
              className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <ActionButton
            id="login-submit"
            type="submit"
            loading={loading}
            loadingText="Signing in…"
            variant="primary"
            className="w-full min-h-[48px]"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In to {school.name}
          </ActionButton>
        </form>

        <p className="text-[11px] text-center text-slate-400 border-t border-slate-100 pt-3">
          Powered by Apexium ERP • Secure Portal Session
        </p>
      </div>
    </div>
  );
}

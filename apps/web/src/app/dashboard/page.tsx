import { getSessionUser } from "@/lib/auth/session";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  CheckCircle,
  GraduationCap,
  FileText,
  Plus,
  Receipt,
  Calendar,
  Activity,
  ArrowRight,
} from "lucide-react";
import { tokens } from "@/lib/design-system/tokens";

import StudentDashboardPage from "./student/page";
import ParentDashboardPage from "./parent/page";
import TeacherHomePage from "./teacher/page";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await getSessionUser();

  // Role-Specific Homepage Delegation
  if (user?.role === "student") {
    return <StudentDashboardPage />;
  }

  if (user?.role === "parent") {
    return <ParentDashboardPage />;
  }

  if (user?.role === "teacher") {
    return <TeacherHomePage />;
  }

  // School Administrator Operational Overview
  const stats = [
    {
      id: "stat-students",
      label: "Total Students",
      value: "—",
      icon: <Users className="w-5 h-5 text-indigo-400" />,
      link: "/dashboard/students",
    },
    {
      id: "stat-attendance",
      label: "Present Today",
      value: "—",
      icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
      link: "/dashboard/attendance",
    },
    {
      id: "stat-teachers",
      label: "Teaching Staff",
      value: "—",
      icon: <GraduationCap className="w-5 h-5 text-sky-400" />,
      link: "/dashboard/hr",
    },
    {
      id: "stat-reports",
      label: "Pending Reports",
      value: "—",
      icon: <FileText className="w-5 h-5 text-amber-400" />,
      link: "/dashboard/reports",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-slide-up">
      {/* ── Page Header ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className={tokens.h2}>
            Welcome back, {user?.firstName ?? "Administrator"}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Here is an operational overview of your school today.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-900 rounded-xl border border-slate-800 px-3.5 py-2">
          <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* ── KPI Metric Cards ────────────────────────────── */}
      <div
        id="dashboard-overview"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {stats.map((stat) => (
          <Link
            key={stat.id}
            id={stat.id}
            href={stat.link}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md transition-all group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {stat.label}
              </span>
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                {stat.icon}
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-extrabold text-white">
                {stat.value}
              </p>
              <span className="text-xs text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
                View <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Dashboard Quick Operations ───────────────────── */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Core Operations
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/students/new"
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all flex items-center gap-4 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                Register Student
              </p>
              <p className="text-xs text-slate-400">Add new admission</p>
            </div>
          </Link>

          <Link
            href="/dashboard/attendance"
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all flex items-center gap-4 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                Mark Attendance
              </p>
              <p className="text-xs text-slate-400">Daily roll-call register</p>
            </div>
          </Link>

          <Link
            href="/dashboard/finance"
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all flex items-center gap-4 group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                Fee Collections
              </p>
              <p className="text-xs text-slate-400">Invoices & reconciliation</p>
            </div>
          </Link>

          <Link
            href="/dashboard/reports"
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 transition-all flex items-center gap-4 group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-600/20 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                Report Cards
              </p>
              <p className="text-xs text-slate-400">Bulk PDF generation</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── System Status & Activity ───────────────────── */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          Recent System Activity
        </h3>
        <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
          <p className="text-xs text-slate-400">
            Real-time audit log feeds will populate as administrative and academic operations occur.
          </p>
        </div>
      </div>
    </div>
  );
}

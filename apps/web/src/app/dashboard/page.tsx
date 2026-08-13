import { getSessionUser } from "@/lib/auth/session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await getSessionUser();

  const roleGreetings: Record<string, string> = {
    admin:   "Here's an overview of your school today.",
    teacher: "Here's a summary of your classes and students.",
    parent:  "Here's a summary for your children.",
    student: "Here's your academic overview.",
  };

  const stats = [
    {
      id:      "stat-students",
      label:   "Total Students",
      value:   "—",
      icon:    <StatIconStudents />,
      accent:  "indigo",
    },
    {
      id:      "stat-attendance",
      label:   "Present Today",
      value:   "—",
      icon:    <StatIconAttendance />,
      accent:  "emerald",
    },
    {
      id:      "stat-teachers",
      label:   "Teachers",
      value:   "—",
      icon:    <StatIconTeachers />,
      accent:  "sky",
    },
    {
      id:      "stat-reports",
      label:   "Pending Reports",
      value:   "—",
      icon:    <StatIconReports />,
      accent:  "amber",
    },
  ] as const;

  const accentMap = {
    indigo:  { bg: "bg-indigo-100", text: "text-indigo-600", border: "border-indigo-200" },
    emerald: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200" },
    sky:     { bg: "bg-sky-100", text: "text-sky-600", border: "border-sky-200" },
    amber:   { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200" },
  };

  return (
    <div className="animate-slide-up max-w-6xl space-y-8">

      {/* ── Page header ───────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, {user?.firstName ?? "User"}!
          </h1>
          <p className="page-subtitle">
            {roleGreetings[user?.role ?? "admin"]}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white rounded-xl border border-slate-200 px-3.5 py-2 shadow-xs">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <span className="font-medium">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────── */}
      <div
        id="dashboard-overview"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {stats.map((stat) => {
          const accent = accentMap[stat.accent];
          return (
            <div
              key={stat.id}
              id={stat.id}
              className={`stat-card border-l-4 ${accent.border}`}
            >
              <div className={`w-11 h-11 rounded-xl ${accent.bg} ${accent.text} flex items-center justify-center flex-shrink-0`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Dashboard Quick Action Shortcuts ────────────── */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Quick Operations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a href="/dashboard/students/new" className="card-hover flex items-center gap-3.5 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-0 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">+</div>
            <div>
              <p className="text-sm font-bold">Register Student</p>
              <p className="text-xs text-indigo-100">Add new admission</p>
            </div>
          </a>

          <a href="/dashboard/attendance" className="card-hover flex items-center gap-3.5 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">✓</div>
            <div>
              <p className="text-sm font-bold">Mark Attendance</p>
              <p className="text-xs text-emerald-100">Daily class register</p>
            </div>
          </a>

          <a href="/dashboard/finance" className="card-hover flex items-center gap-3.5 bg-gradient-to-br from-amber-600 to-amber-700 text-white border-0 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">₦</div>
            <div>
              <p className="text-sm font-bold">Fee Collections</p>
              <p className="text-xs text-amber-100">Invoices & payments</p>
            </div>
          </a>

          <a href="/dashboard/reports" className="card-hover flex items-center gap-3.5 bg-gradient-to-br from-sky-600 to-sky-700 text-white border-0 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">📄</div>
            <div>
              <p className="text-sm font-bold">Report Cards</p>
              <p className="text-xs text-sky-100">Bulk PDF generation</p>
            </div>
          </a>
        </div>
      </div>

      {/* ── Recent Activity Feed ─────────────────────── */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Recent System Activity
        </h3>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
              <div className="skeleton w-8 h-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3 w-3/4 rounded" />
                <div className="skeleton h-2.5 w-1/2 rounded" />
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-400 text-center pt-2">
            Activity will appear here once school operations commence.
          </p>
        </div>
      </div>

    </div>
  );
}

/* ── Stat icon components ───────────────────────────────────── */
function StatIconStudents() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function StatIconAttendance() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function StatIconTeachers() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
      />
    </svg>
  );
}

function StatIconReports() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

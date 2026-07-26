import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your school management dashboard",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login");
  }

  const roleBadgeClass: Record<string, string> = {
    admin:   "badge-admin",
    teacher: "badge-teacher",
    parent:  "badge-parent",
    student: "badge-student",
  };

  return (
    <div className="min-h-screen flex bg-surface">

      {/* ── Dark Sidebar ─────────────────────────────────── */}
      <aside
        id="sidebar"
        className="w-sidebar bg-sidebar flex flex-col flex-shrink-0 h-screen sticky top-0 overflow-y-auto scrollbar-thin"
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
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
          <div>
            <p className="text-sm font-bold text-white leading-none">Apexium ERP</p>
            <p className="text-xs text-slate-500 mt-0.5">School Management</p>
          </div>
        </div>

        {/* Navigation */}
        <nav id="main-nav" className="flex-1 py-4 px-3">
          {/* Main */}
          <p className="nav-group-label">Main</p>
          <NavItem href="/dashboard"           id="nav-dashboard"  label="Dashboard"     icon={<IconDashboard />} />

          {/* Academic — admin + teacher only */}
          {(user.role === "admin" || user.role === "teacher") && (
            <>
              <p className="nav-group-label mt-4">Academic</p>
              <NavItem href="/dashboard/students"   id="nav-students"   label="Students"      icon={<IconStudents />}   />
              <NavItem href="/dashboard/attendance" id="nav-attendance" label="Attendance"     icon={<IconAttendance />} />
              <NavItem href="/dashboard/timetable"  id="nav-timetable"  label="Timetable"      icon={<IconTimetable />}  />
              <NavItem href="/dashboard/grades"     id="nav-grades"     label="Grades"         icon={<IconGrades />}     />
              <NavItem href="/dashboard/reports"    id="nav-reports"    label="Report Cards"   icon={<IconReports />}    />
            </>
          )}

          {/* Parent — read-only child view */}
          {user.role === "parent" && (
            <>
              <p className="nav-group-label mt-4">My Children</p>
              <NavItem href="/dashboard/children"   id="nav-children"   label="My Children"   icon={<IconStudents />}   />
              <NavItem href="/dashboard/attendance" id="nav-attendance" label="Attendance"     icon={<IconAttendance />} />
            </>
          )}

          {/* Student */}
          {user.role === "student" && (
            <>
              <p className="nav-group-label mt-4">My Academics</p>
              <NavItem href="/dashboard/grades"   id="nav-grades"   label="My Grades"    icon={<IconGrades />}  />
              <NavItem href="/dashboard/reports"  id="nav-reports"  label="Report Card"  icon={<IconReports />} />
            </>
          )}

          {/* Admin settings */}
          {user.role === "admin" && (
            <>
              <p className="nav-group-label mt-4">System</p>
              <NavItem href="/dashboard/settings" id="nav-settings" label="Settings" icon={<IconSettings />} />
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-indigo-300">
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-none mb-0.5">
                {user.firstName} {user.lastName}
              </p>
              <span className={`text-xs capitalize ${roleBadgeClass[user.role] ?? "badge-neutral"}`}>
                {user.role}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header
          id="topbar"
          className="bg-white border-b border-slate-100 shadow-elevation-1 px-6 sticky top-0 z-20"
          style={{ height: "var(--topbar-height)" }}
        >
          <div className="flex items-center justify-between h-full">
            {/* Breadcrumb placeholder — filled by child pages */}
            <div id="breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-semibold text-slate-900 capitalize">{user.role} Portal</span>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Notifications bell */}
              <button
                id="notifications-btn"
                aria-label="Notifications"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500
                           hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer relative"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                  />
                </svg>
              </button>

              {/* Avatar */}
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center cursor-pointer
                              hover:bg-indigo-200 transition-colors border border-indigo-200">
                <span className="text-sm font-bold text-indigo-700">
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 p-6 overflow-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ── Nav item component ─────────────────────────────────────── */
function NavItem({
  href,
  icon,
  label,
  id,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  id: string;
}) {
  return (
    <a
      id={id}
      href={href}
      className="nav-item group"
    >
      <span className="flex-shrink-0 transition-colors duration-150 group-hover:text-indigo-400">
        {icon}
      </span>
      <span>{label}</span>
    </a>
  );
}

/* ── Icon components (inline SVG via Heroicons style) ───────── */
function IconDashboard() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

function IconStudents() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function IconAttendance() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}

function IconTimetable() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function IconGrades() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

function IconReports() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

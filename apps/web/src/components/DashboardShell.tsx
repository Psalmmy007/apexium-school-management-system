"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";

interface UserInfo {
  firstName: string;
  lastName: string;
  role: string;
}

interface DashboardShellProps {
  user: UserInfo;
  children: React.ReactNode;
}

function IconSignOut({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      router.push("/auth/login");
      router.refresh();
    }
  };

  const roleBadgeClass: Record<string, string> = {
    admin:   "badge-admin",
    teacher: "badge-teacher",
    parent:  "badge-parent",
    student: "badge-student",
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 relative w-full">

      {/* ── Mobile Overlay Backdrop ──────────────────────── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Dark Sidebar Drawer ───────────────────────────── */}
      <aside
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-sidebar flex flex-col flex-shrink-0 overflow-y-auto scrollbar-thin transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header & Close Button for Mobile */}
        <div className="px-5 py-5 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">Apexium ERP</p>
              <p className="text-xs text-slate-500 mt-0.5">School Management</p>
            </div>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav id="main-nav" className="flex-1 py-4 px-3 space-y-1">
          <p className="nav-group-label">Main</p>
          <NavItem href="/dashboard" id="nav-dashboard" label="Dashboard" icon={<IconDashboard />} onClick={() => setIsMobileMenuOpen(false)} />

          {(user.role === "admin" || user.role === "teacher") && (
            <>
              <p className="nav-group-label mt-4">Academic</p>
              <NavItem href="/dashboard/teacher" id="nav-teacher-portal" label="Teacher Workspace" icon={<IconDashboard />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/admissions" id="nav-admissions" label="Admissions" icon={<IconStudents />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/students" id="nav-students" label="Students" icon={<IconStudents />} onClick={() => setIsMobileMenuOpen(false)} />
              {user.role === "admin" && (
                <NavItem href="/dashboard/academics/structure" id="nav-academic-structure" label="Academic Structure" icon={<IconTimetable />} onClick={() => setIsMobileMenuOpen(false)} />
              )}
              <NavItem href="/dashboard/attendance" id="nav-attendance" label="Attendance" icon={<IconAttendance />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/timetable" id="nav-timetable" label="Timetable" icon={<IconTimetable />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/academics/scores" id="nav-grades" label="Grades" icon={<IconGrades />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/reports" id="nav-reports" label="Report Cards" icon={<IconReports />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/academics/lessons" id="nav-lessons" label="Lessons & Notes" icon={<IconReports />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/academics/assignments" id="nav-assignments" label="Assignments" icon={<IconGrades />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/cbt" id="nav-cbt" label="CBT Exams" icon={<IconGrades />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/teacher/messages" id="nav-messages" label="Parent Messaging" icon={<IconReports />} onClick={() => setIsMobileMenuOpen(false)} />
              {user.role === "admin" && (
                <NavItem href="/dashboard/promotion" id="nav-promotion" label="Session Promotion" icon={<IconPromotion />} onClick={() => setIsMobileMenuOpen(false)} />
              )}
            </>
          )}

          {user.role === "parent" && (
            <>
              <p className="nav-group-label mt-4">Parent Workspace</p>
              <NavItem href="/dashboard/parent" id="nav-parent-portal" label="Parent Portal" icon={<IconDashboard />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/parent/fees" id="nav-parent-fees" label="Fee Invoices" icon={<IconGrades />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/teacher/messages" id="nav-parent-messages" label="Messaging Inbox" icon={<IconReports />} onClick={() => setIsMobileMenuOpen(false)} />
            </>
          )}

          {user.role === "student" && (
            <>
              <p className="nav-group-label mt-4">Student Workspace</p>
              <NavItem href="/dashboard/student" id="nav-student-dashboard" label="Student Portal" icon={<IconDashboard />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/student/timetable" id="nav-student-timetable" label="My Timetable" icon={<IconTimetable />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/student/attendance" id="nav-student-attendance" label="Attendance History" icon={<IconAttendance />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/student/academics" id="nav-student-academics" label="Academic Results" icon={<IconGrades />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/student/cbt" id="nav-student-cbt" label="CBT Exams" icon={<IconGrades />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/student/lms" id="nav-student-lms" label="Lessons & Homework" icon={<IconReports />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/student/notifications" id="nav-student-notifications" label="Notification Centre" icon={<IconReports />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/student/profile" id="nav-student-profile" label="Profile Settings" icon={<IconSettings />} onClick={() => setIsMobileMenuOpen(false)} />
            </>
          )}

          {user.role === "admin" && (
            <>
              <p className="nav-group-label mt-4">Enterprise Operations</p>
              <NavItem href="/dashboard/finance" id="nav-finance" label="Finance & Accounting" icon={<IconReports />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/hr" id="nav-hr" label="HR & Payroll" icon={<IconStudents />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/transport" id="nav-transport" label="Transport System" icon={<IconAttendance />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/inventory" id="nav-inventory" label="Inventory & Fixed Assets" icon={<IconTimetable />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/communication" id="nav-communication" label="Communication Centre" icon={<IconReports />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/analytics" id="nav-analytics" label="Executive Analytics" icon={<IconDashboard />} onClick={() => setIsMobileMenuOpen(false)} />

              <p className="nav-group-label mt-4">SaaS & Group Governance</p>
              <NavItem href="/dashboard/group" id="nav-group" label="Multi-Branch School Group" icon={<IconDashboard />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/settings/data-export" id="nav-data-export" label="Data Portability & Export" icon={<IconSettings />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/platform" id="nav-platform" label="SaaS Platform Operator" icon={<IconLicense />} onClick={() => setIsMobileMenuOpen(false)} />

              <p className="nav-group-label mt-4">System</p>
              <NavItem href="/dashboard/setup" id="nav-setup-wizard" label="School Setup Wizard" icon={<IconPromotion />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/library" id="nav-library" label="Library System" icon={<IconReports />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/hostel" id="nav-hostel" label="Hostel System" icon={<IconAttendance />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/settings/licenses" id="nav-licenses" label="License Center" icon={<IconLicense />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/settings/privacy" id="nav-privacy" label="Data Privacy & NDPR" icon={<IconSettings />} onClick={() => setIsMobileMenuOpen(false)} />
              <NavItem href="/dashboard/settings" id="nav-settings" label="Settings" icon={<IconSettings />} onClick={() => setIsMobileMenuOpen(false)} />
            </>
          )}
        </nav>

        {/* User Profile Footer */}
        <div className="border-t border-sidebar-border px-4 py-4 mt-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
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

            <button
              id="sidebar-signout-btn"
              onClick={handleSignOut}
              disabled={isSigningOut}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer flex-shrink-0 disabled:opacity-50"
            >
              <IconSignOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Area ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:min-h-0 lg:h-screen">

        {/* Responsive Top Bar */}
        <header
          id="topbar"
          className="bg-slate-900 border-b border-slate-800 shadow-md px-4 sm:px-6 sticky top-0 z-30 flex-shrink-0"
          style={{ height: "var(--topbar-height)" }}
        >
          <div className="flex items-center justify-between h-full">

            {/* Left: Mobile Hamburger Button & Title */}
            <div className="flex items-center gap-3">
              <button
                id="mobile-menu-toggle"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle Navigation Menu"
                className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-colors focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div id="breadcrumb" className="flex items-center gap-2 text-sm text-slate-400">
                <span className="font-bold text-white text-base sm:text-sm capitalize tracking-tight">
                  {user.role} Portal
                </span>
              </div>
            </div>

            {/* Right: Notifications, Global Search & Sign Out Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
                }}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 transition cursor-pointer"
                title="Search ERP (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>Search...</span>
                <kbd className="bg-slate-900 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 border border-slate-750">⌘K</kbd>
              </button>

              <GlobalSearch />
              <NotificationBell />

              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center border border-indigo-500 shadow-md">
                  <span className="text-sm font-bold text-white">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </span>
                </div>

                <button
                  id="topbar-signout-btn"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-slate-800 border border-slate-700 hover:border-red-900/50 transition-all cursor-pointer disabled:opacity-50"
                  aria-label="Sign Out"
                >
                  <IconSignOut className="w-4 h-4 text-slate-400 hover:text-red-400" />
                  <span className="hidden sm:inline">{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
                </button>
              </div>
            </div>

          </div>
        </header>

        {/* Page Content Canvas */}
        <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8 animate-fade-in bg-slate-950">
          {children}
        </main>
      </div>

    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  id,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  id: string;
  onClick?: () => void;
}) {
  return (
    <a
      id={id}
      href={href}
      onClick={onClick}
      className="nav-item group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-all cursor-pointer"
    >
      <span className="flex-shrink-0 text-slate-400 group-hover:text-indigo-400 transition-colors">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </a>
  );
}

function IconDashboard() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function IconStudents() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function IconAttendance() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function IconTimetable() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconGrades() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function IconReports() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function IconPromotion() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function IconLicense() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

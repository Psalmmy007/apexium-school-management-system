"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotificationBell } from "@/components/NotificationBell";
import {
  GraduationCap,
  CalendarCheck,
  Laptop,
  BookOpen,
  Bell,
  FileText,
  Award,
  ArrowRight,
} from "lucide-react";
import { tokens } from "@/lib/design-system/tokens";

interface DashboardData {
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    photoUrl?: string;
  };
  attendanceSummary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
  };
  cbtExamsCount: number;
  unreadNotificationsCount: number;
  upcomingAssignments: Array<{ id: string; title: string; dueDate?: string }>;
  announcements: Array<{ id: string; title: string; body: string; publishedAt: string }>;
  recentScores: Array<{ id: string; caScore: number; examScore: number; totalScore: number; grade: string }>;
}

export default function StudentDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch("/api/student/dashboard");
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Failed loading student dashboard", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-slide-up">
      {/* ── Page Header ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className={tokens.h2}>Student Portal</h1>
          <p className="text-slate-400 text-sm mt-1">
            Welcome back, {data?.student.firstName ?? "Student"}. Here is your academic schedule and standing.
          </p>
        </div>
        <NotificationBell />
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium animate-pulse">
          Loading student workspace...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Student Header Profile Banner */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-indigo-400" />
                    {data?.student.firstName} {data?.student.lastName}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Admission Number: {data?.student.admissionNumber}
                  </p>
                </div>
                <Link
                  href="/dashboard/student/academics"
                  className="inline-flex items-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl transition shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span>Report Cards</span>
                </Link>
              </div>

              {/* KPI Bar */}
              {data && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    <p className="text-xs font-medium text-slate-400">Attendance</p>
                    <p className="text-xl font-extrabold text-emerald-400 mt-0.5">
                      {data.attendanceSummary.percentage}%
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    <p className="text-xs font-medium text-slate-400">CBT Exams</p>
                    <p className="text-xl font-extrabold text-amber-400 mt-0.5">
                      {data.cbtExamsCount}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    <p className="text-xs font-medium text-slate-400">Assignments</p>
                    <p className="text-xl font-extrabold text-indigo-400 mt-0.5">
                      {data.upcomingAssignments.length}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    <p className="text-xs font-medium text-slate-400">Alerts</p>
                    <p className="text-xl font-extrabold text-rose-400 mt-0.5">
                      {data.unreadNotificationsCount}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Portal Launchers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/dashboard/student/cbt"
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md transition-all group flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Take Available CBT Exam
                  </p>
                  <p className="text-xs text-slate-400">Timed computer assessments</p>
                </div>
              </Link>

              <Link
                href="/dashboard/student/lms"
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md transition-all group flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    Submit Assignment (LMS)
                  </p>
                  <p className="text-xs text-slate-400">Review homework & submit work</p>
                </div>
              </Link>

              <Link
                href="/dashboard/student/academics"
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md transition-all group flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    Grades & Report Card
                  </p>
                  <p className="text-xs text-slate-400">Term grades & published reports</p>
                </div>
              </Link>

              <Link
                href="/dashboard/student/attendance"
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md transition-all group flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                    Attendance History
                  </p>
                  <p className="text-xs text-slate-400">Term roll-call & presence record</p>
                </div>
              </Link>
            </div>

            {/* Recent Assessment Scores */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-400" />
                Recent Term Scores
              </h3>

              {!data?.recentScores || data.recentScores.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-800 rounded-xl">
                  No scores recorded yet for the current term.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4 rounded-l-lg">Continuous Assessment (40%)</th>
                        <th className="py-3 px-4">Exam (60%)</th>
                        <th className="py-3 px-4">Total Score</th>
                        <th className="py-3 px-4 rounded-r-lg">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {data.recentScores.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4">{s.caScore}</td>
                          <td className="py-3 px-4">{s.examScore}</td>
                          <td className="py-3 px-4 font-bold text-white">{s.totalScore}</td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800">
                              {s.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            {/* Upcoming Homework Assignments */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                Pending Assignments
              </h3>

              {!data?.upcomingAssignments || data.upcomingAssignments.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-800 rounded-xl">
                  No homework assignments pending submission.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {data.upcomingAssignments.map((asg) => (
                    <Link
                      key={asg.id}
                      href="/dashboard/student/lms"
                      className="block p-3.5 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-1 group"
                    >
                      <p className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {asg.title}
                      </p>
                      {asg.dueDate && (
                        <p className="text-[10px] text-slate-500">
                          Due: {new Date(asg.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* School Notices */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" />
                School Notices
              </h3>

              {!data?.announcements || data.announcements.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-800 rounded-xl">
                  No active announcements.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5"
                    >
                      <h4 className="text-xs font-bold text-white">{ann.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{ann.body}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(ann.publishedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotificationBell } from "@/components/NotificationBell";

interface OverviewData {
  todayTimetableCount: number;
  assignedClassesCount: number;
  pendingCbtGradingCount: number;
  pendingLmsGradingCount: number;
  unreadMessagesCount: number;
}

export default function TeacherHomePage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchOverview() {
      try {
        const res = await fetch("/api/teacher/overview");
        const json = await res.json();
        if (json.success && json.data) {
          setOverview(json.data);
        }
      } catch (e) {
        console.error("Failed loading teacher overview", e);
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-8 rounded-3xl shadow-lg border border-indigo-900/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start justify-between">
          <div>
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 font-bold text-xs rounded-full uppercase tracking-wider">
              Teacher Portal Dashboard
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-white">
              Welcome back, Teacher
            </h1>
            <p className="text-indigo-200 text-sm mt-1">
              Manage your assigned classes, daily timetable, student assessments, and messages.
            </p>
          </div>
          <div className="bg-white/10 p-1.5 rounded-xl backdrop-blur-sm">
            <NotificationBell />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/academics/scores"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow transition-all flex items-center gap-2"
          >
            📝 Fast Bulk Score Entry
          </Link>
          <Link
            href="/dashboard/attendance"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl border border-slate-700 transition-all flex items-center gap-2"
          >
            📅 Class Attendance
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Loading teacher dashboard...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Widget 1: Today's Timetable */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today&apos;s Periods</span>
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">⏰</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{overview?.todayTimetableCount ?? 0}</p>
            <Link href="/dashboard/timetable" className="text-xs font-bold text-indigo-600 hover:underline inline-block pt-1">
              View Schedule →
            </Link>
          </div>

          {/* Widget 2: Pending LMS Grading */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Submissions</span>
              <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">📚</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{overview?.pendingLmsGradingCount ?? 0}</p>
            <Link href="/dashboard/academics/assignments" className="text-xs font-bold text-indigo-600 hover:underline inline-block pt-1">
              Grade Assignments →
            </Link>
          </div>

          {/* Widget 3: Pending CBT Exams */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active CBT Exams</span>
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">💻</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{overview?.pendingCbtGradingCount ?? 0}</p>
            <Link href="/dashboard/cbt" className="text-xs font-bold text-indigo-600 hover:underline inline-block pt-1">
              Manage CBT Portal →
            </Link>
          </div>

          {/* Widget 4: Messages */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unread Messages</span>
              <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">💬</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{overview?.unreadMessagesCount ?? 0}</p>
            <Link href="/dashboard/teacher/messages" className="text-xs font-bold text-indigo-600 hover:underline inline-block pt-1">
              Open Messages →
            </Link>
          </div>
        </div>
      )}

      {/* Quick Action Navigation Grid */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Teacher Workspace Tools</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/academics/lessons"
            className="p-5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all group"
          >
            <div className="text-xl mb-1">📖</div>
            <h3 className="font-bold text-slate-900 group-hover:text-indigo-600">Lesson Notes & Curriculum</h3>
            <p className="text-xs text-slate-500 mt-1">Publish scheme-of-work topics with low-bandwidth video & audio notes.</p>
          </Link>

          <Link
            href="/dashboard/academics/assignments"
            className="p-5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all group"
          >
            <div className="text-xl mb-1">✍️</div>
            <h3 className="font-bold text-slate-900 group-hover:text-indigo-600">Assignments & Grading</h3>
            <p className="text-xs text-slate-500 mt-1">Create assignments, review student submissions, and sync CA grades.</p>
          </Link>

          <Link
            href="/dashboard/teacher/messages"
            className="p-5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all group"
          >
            <div className="text-xl mb-1">💬</div>
            <h3 className="font-bold text-slate-900 group-hover:text-indigo-600">Parent & Admin Messaging</h3>
            <p className="text-xs text-slate-500 mt-1">Send secure threaded messages to verified student guardians.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotificationBell } from "@/components/NotificationBell";
import {
  Clock,
  BookOpen,
  Laptop,
  MessageSquare,
  FileEdit,
  CalendarCheck,
  BookMarked,
  ArrowRight,
  GraduationCap,
  FileText,
} from "lucide-react";
import { tokens } from "@/lib/design-system/tokens";

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
    <div className="max-w-7xl mx-auto space-y-8 animate-slide-up">
      {/* ── Header Area ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className={tokens.h2}>Teacher Portal</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your assigned classes, daily timetable, student assessments, and messages.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/academics/scores"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md transition-all"
          >
            <FileEdit className="w-4 h-4" />
            <span>Fast Score Entry</span>
          </Link>
          <Link
            href="/dashboard/attendance"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm rounded-xl border border-slate-700 transition-all"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Class Attendance</span>
          </Link>
          <NotificationBell />
        </div>
      </div>

      {/* ── Metrics Grid ───────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium animate-pulse">
          Loading teacher workspace...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Widget 1: Today's Timetable */}
          <Link
            href="/dashboard/timetable"
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md transition-all group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Today&apos;s Periods
              </span>
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-white">
                {overview?.todayTimetableCount ?? 0}
              </p>
              <span className="text-xs text-indigo-400 font-medium inline-flex items-center gap-1 mt-1">
                View Schedule <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* Widget 2: Pending LMS Grading */}
          <Link
            href="/dashboard/academics/assignments"
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md transition-all group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Submissions to Grade
              </span>
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-white">
                {overview?.pendingLmsGradingCount ?? 0}
              </p>
              <span className="text-xs text-amber-400 font-medium inline-flex items-center gap-1 mt-1">
                Grade Assignments <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* Widget 3: Pending CBT Exams */}
          <Link
            href="/dashboard/cbt"
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md transition-all group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Active CBT Exams
              </span>
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
                <Laptop className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-white">
                {overview?.pendingCbtGradingCount ?? 0}
              </p>
              <span className="text-xs text-emerald-400 font-medium inline-flex items-center gap-1 mt-1">
                Manage CBT <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* Widget 4: Messages */}
          <Link
            href="/dashboard/teacher/messages"
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md transition-all group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Unread Messages
              </span>
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-white">
                {overview?.unreadMessagesCount ?? 0}
              </p>
              <span className="text-xs text-sky-400 font-medium inline-flex items-center gap-1 mt-1">
                Open Messages <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* ── Quick Action Navigation Grid ─────────────────── */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Teacher Workspace Tools
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/attendance"
            className="p-5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 mb-3">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white group-hover:text-emerald-300 transition-colors">
              Class Attendance
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Mark and sync daily roll-call attendance for your assigned classes.
            </p>
          </Link>

          <Link
            href="/dashboard/academics/scores"
            className="p-5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 mb-3">
              <FileEdit className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white group-hover:text-amber-300 transition-colors">
              Enter Fast Scores
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Input continuous assessment (CA) and exam scores with live grading.
            </p>
          </Link>

          <Link
            href="/dashboard/academics/lessons"
            className="p-5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 mb-3">
              <BookMarked className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors">
              Lesson Notes
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Publish scheme-of-work topics with lightweight notes and audio.
            </p>
          </Link>

          <Link
            href="/dashboard/academics/assignments"
            className="p-5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 mb-3">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white group-hover:text-sky-300 transition-colors">
              Assignments & LMS
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Create homework assignments, review submissions, and sync grades.
            </p>
          </Link>

          <Link
            href="/dashboard/reports"
            className="p-5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 mb-3">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors">
              Class Report Cards
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Generate and review PDF term reports for your assigned class.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

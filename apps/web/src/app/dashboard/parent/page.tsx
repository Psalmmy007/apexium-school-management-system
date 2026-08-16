"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotificationBell } from "@/components/NotificationBell";
import {
  Users,
  CreditCard,
  CalendarCheck,
  Award,
  Bell,
  ArrowRight,
  AlertCircle,
  GraduationCap,
  FileText,
  MessageSquare,
} from "lucide-react";
import { tokens } from "@/lib/design-system/tokens";

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  classId?: string | null;
}

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  records: Array<{ date: string; status: string; remarks?: string }>;
}

interface ScoreRecord {
  id: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
}

export default function ParentDashboardPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [childrenRes, announcementsRes] = await Promise.all([
          fetch("/api/parent/children"),
          fetch("/api/parent/announcements"),
        ]);
        const childrenData = await childrenRes.json();
        const announcementsData = await announcementsRes.json();

        if (childrenData.success && childrenData.data.length > 0) {
          setChildren(childrenData.data);
          setSelectedChildId(childrenData.data[0].id);
        }
        if (announcementsData.success) {
          setAnnouncements(announcementsData.data);
        }
      } catch (err) {
        console.error("Failed loading parent dashboard", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;

    async function loadChildDetails() {
      try {
        const res = await fetch(`/api/parent/children?studentId=${selectedChildId}`);
        const result = await res.json();
        if (result.success) {
          setAttendance(result.data.attendance);
          setScores(result.data.scores);
        }
      } catch (err) {
        console.error("Failed loading child details", err);
      }
    }
    loadChildDetails();
  }, [selectedChildId]);

  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-slide-up">
      {/* ── Page Header ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className={tokens.h2}>Parent Portal</h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitor academic progress, daily attendance, fee invoices, and school notices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Multi-Child Switcher */}
          {children.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 px-2">Ward:</span>
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors min-h-[36px] ${
                    selectedChildId === child.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {child.firstName}
                </button>
              ))}
            </div>
          )}
          <NotificationBell />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium animate-pulse">
          Loading parent workspace...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {children.length === 0 ? (
              <div className="p-6 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-300 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
                <span className="text-sm font-medium">
                  No student records are currently linked to your parent account. Please contact school administration.
                </span>
              </div>
            ) : (
              /* Selected Child Profile Header */
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-indigo-400" />
                      {selectedChild?.firstName} {selectedChild?.lastName}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Admission Number: {selectedChild?.admissionNumber}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/parent/fees?studentId=${selectedChildId}`}
                    className="inline-flex items-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl transition shadow-sm"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Fee Invoices &amp; Pay</span>
                  </Link>
                </div>

                {/* Attendance Quick Counters */}
                {attendance && (
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-center">
                      <p className="text-xs font-medium text-slate-400">Present</p>
                      <p className="text-2xl font-extrabold text-emerald-400 mt-0.5">
                        {attendance.present} <span className="text-xs text-slate-500 font-normal">Days</span>
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-center">
                      <p className="text-xs font-medium text-slate-400">Absent</p>
                      <p className="text-2xl font-extrabold text-red-400 mt-0.5">
                        {attendance.absent} <span className="text-xs text-slate-500 font-normal">Days</span>
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-center">
                      <p className="text-xs font-medium text-slate-400">Late</p>
                      <p className="text-2xl font-extrabold text-amber-400 mt-0.5">
                        {attendance.late} <span className="text-xs text-slate-500 font-normal">Days</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Parent Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href={`/dashboard/parent/fees${selectedChildId ? `?studentId=${selectedChildId}` : ""}`}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md transition-all group flex items-center gap-3.5"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Pay Fees &amp; Invoices
                  </p>
                  <p className="text-[10px] text-slate-400">Term tuition &amp; bills</p>
                </div>
              </Link>

              <Link
                href={`/dashboard/parent${selectedChildId ? `?studentId=${selectedChildId}` : ""}`}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md transition-all group flex items-center gap-3.5"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                    View Report Cards
                  </p>
                  <p className="text-[10px] text-slate-400">Term academic summary</p>
                </div>
              </Link>

              <Link
                href="/dashboard/parent/messages"
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md transition-all group flex items-center gap-3.5"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">
                    Message Teacher
                  </p>
                  <p className="text-[10px] text-slate-400">Direct guardian chat</p>
                </div>
              </Link>
            </div>

            {/* Academic Overview Scores */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-400" />
                  Recent Academic Scores
                </h3>
              </div>

              {scores.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-800 rounded-xl">
                  No recorded assessment scores published for this term yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4 rounded-l-lg">Continuous Assessment (40%)</th>
                        <th className="py-3 px-4">Exam (60%)</th>
                        <th className="py-3 px-4">Cumulative Total</th>
                        <th className="py-3 px-4 rounded-r-lg">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {scores.slice(0, 10).map((s) => (
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

          {/* Announcements Sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" />
                School Notices
              </h3>

              {announcements.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-800 rounded-xl">
                  No active announcements from school administration.
                </p>
              ) : (
                <div className="space-y-3">
                  {announcements.map((ann) => (
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

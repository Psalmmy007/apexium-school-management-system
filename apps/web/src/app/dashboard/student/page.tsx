"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";

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
  const [loading, setLoading] = useState(true);

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
    <DashboardShell user={{ firstName: data?.student.firstName ?? "Student", lastName: data?.student.lastName ?? "User", role: "student" }}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Student Portal</h1>
          <p className="text-sm text-gray-500">Welcome back, {data?.student.firstName ?? "Student"}. Here is your academic summary.</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading student workspace...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Stats Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header Hero Banner */}
              <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-xl shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold">
                      {data?.student.firstName} {data?.student.lastName}
                    </h2>
                    <p className="text-xs text-indigo-200 mt-1">
                      Admission Number: {data?.student.admissionNumber}
                    </p>
                  </div>
                  <a
                    href="/dashboard/student/academics"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg transition"
                  >
                    View Report Cards
                  </a>
                </div>

                {/* KPI Bar */}
                {data && (
                  <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-indigo-800/60 text-center">
                    <div>
                      <p className="text-xs text-indigo-200">Attendance</p>
                      <p className="text-lg font-extrabold text-green-400">{data.attendanceSummary.percentage}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-200">CBT Exams</p>
                      <p className="text-lg font-extrabold text-amber-400">{data.cbtExamsCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-200">Assignments</p>
                      <p className="text-lg font-extrabold text-indigo-300">{data.upcomingAssignments.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-200">Unread Alerts</p>
                      <p className="text-lg font-extrabold text-rose-400">{data.unreadNotificationsCount}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Links Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <a href="/dashboard/student/timetable" className="p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-400 transition text-center">
                  <p className="font-bold text-sm text-gray-900">Timetable</p>
                  <p className="text-[11px] text-gray-500">Weekly schedule</p>
                </a>
                <a href="/dashboard/student/attendance" className="p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-400 transition text-center">
                  <p className="font-bold text-sm text-gray-900">Attendance</p>
                  <p className="text-[11px] text-gray-500">Daily registers</p>
                </a>
                <a href="/dashboard/student/cbt" className="p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-400 transition text-center">
                  <p className="font-bold text-sm text-gray-900">CBT Exams</p>
                  <p className="text-[11px] text-gray-500">Online testing</p>
                </a>
                <a href="/dashboard/student/lms" className="p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-400 transition text-center">
                  <p className="font-bold text-sm text-gray-900">LMS Notes</p>
                  <p className="text-[11px] text-gray-500">Lessons & homework</p>
                </a>
              </div>

              {/* Recent Academic Scores */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Recent Academic Performance</h3>
                {data?.recentScores.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">No score entries found for current term.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                        <tr>
                          <th className="py-2.5 px-3">CA Score</th>
                          <th className="py-2.5 px-3">Exam Score</th>
                          <th className="py-2.5 px-3">Total Score</th>
                          <th className="py-2.5 px-3">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data?.recentScores.map((s) => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="py-2.5 px-3">{s.caScore}</td>
                            <td className="py-2.5 px-3">{s.examScore}</td>
                            <td className="py-2.5 px-3 font-bold text-gray-900">{s.totalScore}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
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

            {/* Sidebar Column */}
            <div className="space-y-6">
              {/* Upcoming Assignments */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <h3 className="text-base font-bold text-gray-900">Upcoming Homework & Assignments</h3>
                {data?.upcomingAssignments.length === 0 ? (
                  <p className="text-xs text-gray-500">No active assignments pending.</p>
                ) : (
                  <div className="space-y-2">
                    {data?.upcomingAssignments.map((a) => (
                      <div key={a.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs space-y-1">
                        <p className="font-semibold text-gray-900">{a.title}</p>
                        {a.dueDate && <p className="text-[10px] text-gray-400">Due: {new Date(a.dueDate).toLocaleDateString()}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* School Announcements */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <h3 className="text-base font-bold text-gray-900">Announcements</h3>
                {data?.announcements.length === 0 ? (
                  <p className="text-xs text-gray-500">No active announcements.</p>
                ) : (
                  <div className="space-y-2">
                    {data?.announcements.map((ann) => (
                      <div key={ann.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs space-y-1">
                        <p className="font-semibold text-gray-900">{ann.title}</p>
                        <p className="text-gray-600 leading-relaxed">{ann.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/NotificationBell";

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
  const [loading, setLoading] = useState(true);

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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Parent Portal</h1>
              <p className="text-sm text-gray-500">Monitor academic performance, attendance, and fee status</p>
            </div>
            <div className="md:hidden">
              <NotificationBell />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <NotificationBell />
            </div>

            {/* Multi-Child Switcher */}
            {children.length > 1 && (
              <div className="flex items-center space-x-2 bg-gray-100 p-1.5 rounded-lg border border-gray-200">
                <span className="text-xs font-semibold text-gray-600 px-2">Select Child:</span>
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChildId(child.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      selectedChildId === child.id
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {child.firstName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading parent workspace...</div>
        ) : children.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-center gap-3">
            <span className="font-semibold">Notice:</span>
            <span>No student records are linked to your parent account. Please contact school administration.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Stats Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Selected Child Header */}
              <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-xl shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold">
                      {selectedChild?.firstName} {selectedChild?.lastName}
                    </h2>
                    <p className="text-xs text-indigo-200 mt-1">
                      Admission Number: {selectedChild?.admissionNumber}
                    </p>
                  </div>
                  <a
                    href={`/dashboard/parent/fees?studentId=${selectedChildId}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg transition"
                  >
                    View Fees & Pay
                  </a>
                </div>

                {/* Quick Attendance Counters */}
                {attendance && (
                  <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-indigo-800/60">
                    <div>
                      <p className="text-xs text-indigo-200">Present</p>
                      <p className="text-xl font-extrabold text-green-400">{attendance.present} Days</p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-200">Absent</p>
                      <p className="text-xl font-extrabold text-red-400">{attendance.absent} Days</p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-200">Late</p>
                      <p className="text-xl font-extrabold text-amber-400">{attendance.late} Days</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Academic Overview */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Recent Grades & Scores
                </h3>

                {scores.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">No recorded scores available for this term.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                        <tr>
                          <th className="py-2.5 px-3">CA (40%)</th>
                          <th className="py-2.5 px-3">Exam (60%)</th>
                          <th className="py-2.5 px-3">Total</th>
                          <th className="py-2.5 px-3">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {scores.slice(0, 10).map((s) => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="py-2.5 px-3">{s.caScore}</td>
                            <td className="py-2.5 px-3">{s.examScore}</td>
                            <td className="py-2.5 px-3 font-semibold text-gray-900">{s.totalScore}</td>
                            <td className="py-2.5 px-3">
                              <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
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
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Announcements & Events
                </h3>

                {announcements.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">No active announcements.</p>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((ann) => (
                      <div key={ann.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
                        <h4 className="text-sm font-semibold text-gray-900">{ann.title}</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">{ann.body}</p>
                        <p className="text-[10px] text-gray-400">
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

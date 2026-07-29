"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";

interface AttendanceData {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
  records: Array<{ id: string; date: string; status: string; remarks?: string }>;
}

export default function StudentAttendancePage() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAttendance() {
      try {
        const res = await fetch("/api/student/attendance");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Failed to load attendance", err);
      } finally {
        setLoading(false);
      }
    }
    loadAttendance();
  }, []);

  return (
    <DashboardShell user={{ firstName: "Student", lastName: "User", role: "student" }}>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Attendance History</h1>
          <p className="text-sm text-gray-500">Track your daily class registers and attendance percentage</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading attendance history...</div>
        ) : (
          <div className="space-y-6">
            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                <p className="text-xs text-gray-500 font-semibold uppercase">Total Days</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{data?.total}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                <p className="text-xs text-green-600 font-semibold uppercase">Present</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{data?.present}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                <p className="text-xs text-red-600 font-semibold uppercase">Absent</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{data?.absent}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                <p className="text-xs text-amber-600 font-semibold uppercase">Late</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{data?.late}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                <p className="text-xs text-indigo-600 font-semibold uppercase font-mono">Percentage</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{data?.percentage}%</p>
              </div>
            </div>

            {/* Attendance Logs Table */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Attendance Log</h2>

              {data?.records.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No attendance registers marked yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data?.records.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-semibold text-gray-900">{r.date}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase ${
                                r.status === "present"
                                  ? "bg-green-100 text-green-700"
                                  : r.status === "absent"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-gray-500">{r.remarks ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

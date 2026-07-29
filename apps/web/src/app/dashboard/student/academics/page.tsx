"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";

interface ScoreRecord {
  id: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  createdAt: string;
}

export default function StudentAcademicsPage() {
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [gpa, setGpa] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAcademics() {
      try {
        const res = await fetch("/api/student/academics");
        const json = await res.json();
        if (json.success) {
          setScores(json.data.scores);
          setGpa(json.data.gpa);
        }
      } catch (err) {
        console.error("Failed to load academic results", err);
      } finally {
        setLoading(false);
      }
    }
    loadAcademics();
  }, []);

  return (
    <DashboardShell user={{ firstName: "Student", lastName: "User", role: "student" }}>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Academic Results & Report Cards</h1>
            <p className="text-sm text-gray-500">View your term subject grades, CA/Exam score breakdown, and download PDF report cards</p>
          </div>
          <a
            href="/dashboard/reports"
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-sm"
          >
            Download PDF Report Card
          </a>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading academic records...</div>
        ) : (
          <div className="space-y-6">
            {/* Average Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-xl shadow-sm flex justify-between items-center">
              <div>
                <p className="text-xs text-indigo-200 uppercase font-semibold">Term Cumulative Average</p>
                <p className="text-3xl font-extrabold mt-1">{gpa}%</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-indigo-200">Total Subjects Recorded</p>
                <p className="text-xl font-bold mt-1">{scores.length}</p>
              </div>
            </div>

            {/* Subject Scores Table */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Subject Breakdown</h2>

              {scores.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No scores recorded for this academic term.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">CA (40%)</th>
                        <th className="py-2.5 px-3">Exam (60%)</th>
                        <th className="py-2.5 px-3">Total Score</th>
                        <th className="py-2.5 px-3">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {scores.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3">{s.caScore}</td>
                          <td className="py-2.5 px-3">{s.examScore}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-900">{s.totalScore}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
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
        )}
      </div>
    </DashboardShell>
  );
}

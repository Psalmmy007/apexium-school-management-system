"use client";

import { useEffect, useState } from "react";

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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Results & Report Cards</h1>
          <p className="text-sm text-gray-500">View your term subject grades, CA/Exam score breakdown, and download PDF report cards</p>
        </div>
        <a
          href="/api/reports/download"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
        >
          Download PDF Report Card
        </a>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading academic performance...</div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Overall GPA / Average</p>
              <p className="text-2xl font-extrabold text-indigo-600 mt-1">{gpa.toFixed(2)} / 4.00</p>
            </div>
            <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-bold rounded-full">
              Good Standing
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Term Score Sheet</h3>
            {scores.length === 0 ? (
              <p className="text-sm text-gray-500">No score entries recorded for this term yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">CA Score (40)</th>
                      <th className="py-2.5 px-3">Exam Score (60)</th>
                      <th className="py-2.5 px-3">Total (100)</th>
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
      )}
    </div>
  );
}

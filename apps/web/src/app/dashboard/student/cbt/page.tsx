"use client";

import { useEffect, useState } from "react";

interface CbtExam {
  id: string;
  title: string;
  durationMinutes: number;
  status: string;
}

interface CbtSession {
  id: string;
  examId: string;
  score?: number;
  totalQuestions?: number;
  status: string;
  startedAt: string;
}

export default function StudentCbtPage() {
  const [availableExams, setAvailableExams] = useState<CbtExam[]>([]);
  const [sessions, setSessions] = useState<CbtSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCbt() {
      try {
        const res = await fetch("/api/student/cbt");
        const json = await res.json();
        if (json.success) {
          setAvailableExams(json.data.availableExams);
          setSessions(json.data.sessions);
        }
      } catch (err) {
        console.error("Failed to load CBT data", err);
      } finally {
        setLoading(false);
      }
    }
    loadCbt();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Computer-Based Testing (CBT)</h1>
        <p className="text-sm text-gray-500">Take assigned online exams and review completed test history</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading online testing portal...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Exams */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Available Exams</h2>
            {availableExams.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No active CBT exams scheduled for your class.</p>
            ) : (
              <div className="space-y-3">
                {availableExams.map((exam) => (
                  <div key={exam.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900">{exam.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">Duration: {exam.durationMinutes} minutes</p>
                    </div>
                    <a
                      href={`/dashboard/cbt`}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition"
                    >
                      Take Exam
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Exam Sessions */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Exam Session History</h2>
            {sessions.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">You have not taken any CBT exams yet.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div key={s.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs flex justify-between items-center">
                    <div>
                      <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded ${s.status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {s.status}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(s.startedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      {s.score !== undefined && (
                        <p className="font-bold text-sm text-gray-900">Score: {s.score}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

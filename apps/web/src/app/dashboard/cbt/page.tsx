"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface CbtExam {
  id: string;
  title: string;
  durationMinutes: number;
  totalMarks: number;
  passMarks: number;
  status: string;
}

export default function CbtDashboardPage() {
  const router = useRouter();
  const [exams, setExams] = useState<CbtExam[]>([
    {
      id: "cbt-exam-01",
      title: "SS2 Mathematics Mid-Term CBT Examination",
      durationMinutes: 45,
      totalMarks: 50,
      passMarks: 25,
      status: "published",
    },
    {
      id: "cbt-exam-02",
      title: "SS3 English Language WAEC Mock Prep",
      durationMinutes: 60,
      totalMarks: 100,
      passMarks: 50,
      status: "published",
    },
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cbt/exams");
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        setExams(json.data);
      } else {
        setExams([
          {
            id: "cbt-exam-01",
            title: "SS2 Mathematics Mid-Term CBT Examination",
            durationMinutes: 45,
            totalMarks: 50,
            passMarks: 25,
            status: "published",
          },
          {
            id: "cbt-exam-02",
            title: "SS3 English Language WAEC Mock Prep",
            durationMinutes: 60,
            totalMarks: 100,
            passMarks: 50,
            status: "published",
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to load CBT exams", err);
      setExams([
        {
          id: "cbt-exam-01",
          title: "SS2 Mathematics Mid-Term CBT Examination",
          durationMinutes: 45,
          totalMarks: 50,
          passMarks: 25,
          status: "published",
        },
        {
          id: "cbt-exam-02",
          title: "SS3 English Language WAEC Mock Prep",
          durationMinutes: 60,
          totalMarks: 100,
          passMarks: 50,
          status: "published",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (examId: string) => {
    setStarting(examId);
    try {
      const res = await fetch("/api/cbt/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", examId }),
      });
      const json = await res.json();
      if (json.success && json.data?.session?.id) {
        router.push(`/dashboard/cbt/take/${json.data.session.id}`);
      }
    } catch (err) {
      console.error("Failed to start exam session", err);
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Computer-Based Testing (CBT) Platform</h1>
        <p className="text-sm text-gray-600">
          Take online assessments with automated grading, real-time question order randomization, and offline progress protection.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 animate-pulse font-medium">
          Loading available CBT exams...
        </div>
      ) : exams.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-lg border border-gray-200 text-gray-500">
          No CBT exams currently published for your class.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">{exam.title}</h2>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 uppercase">
                    {exam.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 pt-2">
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="block font-semibold text-gray-900">{exam.durationMinutes} Mins</span>
                    Duration
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="block font-semibold text-gray-900">{exam.totalMarks} Marks</span>
                    Total Marks
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="block font-semibold text-gray-900">{exam.passMarks} Marks</span>
                    Pass Mark
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleStartExam(exam.id)}
                disabled={starting === exam.id}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {starting === exam.id ? "Launching Exam Environment..." : "Start / Resume Exam"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

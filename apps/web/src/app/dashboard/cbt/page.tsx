"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackNavigation } from "@/components/ui/BackNavigation";
import { ActionButton } from "@/components/ui/ActionButton";
import { Laptop, Clock, Award, CheckCircle2, ArrowRight } from "lucide-react";
import { tokens } from "@/lib/design-system/tokens";

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
      }
    } catch (err) {
      console.error("Failed to load CBT exams", err);
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
        body: JSON.stringify({ examId }),
      });
      const json = await res.json();
      if (json.success && json.data?.id) {
        router.push(`/dashboard/cbt/take/${json.data.id}`);
      } else {
        router.push(`/dashboard/cbt/take/${examId}`);
      }
    } catch (err) {
      console.error("Failed to start exam session", err);
      router.push(`/dashboard/cbt/take/${examId}`);
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Back to Dashboard Navigation */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <Laptop className="w-5 h-5" />
          </span>
          Computer-Based Testing (CBT) Platform
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Administer and take timed assessments with automated grading and question randomization.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 animate-pulse font-medium">
          Loading available CBT exams...
        </div>
      ) : exams.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400">
          No CBT exams currently published for your class.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between space-y-5 hover:border-slate-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">{exam.title}</h2>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800 uppercase">
                    {exam.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-300 pt-2">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                    <p className="text-slate-400 text-[11px]">Duration</p>
                    <p className="font-bold text-white mt-0.5">{exam.durationMinutes} mins</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                    <p className="text-slate-400 text-[11px]">Total Marks</p>
                    <p className="font-bold text-white mt-0.5">{exam.totalMarks}</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                    <p className="text-slate-400 text-[11px]">Pass Marks</p>
                    <p className="font-bold text-emerald-400 mt-0.5">{exam.passMarks}</p>
                  </div>
                </div>
              </div>

              <ActionButton
                onClick={() => handleStartExam(exam.id)}
                loading={starting === exam.id}
                loadingText="Launching Exam Engine…"
                variant="primary"
                className="w-full min-h-[44px]"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Start / Resume Exam
              </ActionButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

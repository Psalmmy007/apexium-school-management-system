"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { BackNavigation } from "@/components/ui/BackNavigation";

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  options?: Array<{ id: string; text: string }>;
  marks: number;
  order: number;
}

interface ExamData {
  id: string;
  title: string;
  durationMinutes?: number;
  totalMarks?: number;
  passMarks?: number;
}

export default function EntranceExamPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const slug = params.slug as string;
  const reference = searchParams.get("reference") || "";
  const email = searchParams.get("email") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [exam, setExam] = useState<ExamData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; percentage: string } | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  useEffect(() => {
    if (!reference || !email) {
      setError("Reference number and guardian email are required to access your entrance exam.");
      setLoading(false);
      return;
    }

    async function loadExam() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(
          `/api/admissions/exam?reference=${encodeURIComponent(reference)}&email=${encodeURIComponent(email)}&slug=${encodeURIComponent(slug)}`,
          { headers: { "x-apexium-tenant-slug": slug } }
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Unable to load entrance exam.");
        }

        const data = await res.json();
        setExam(data.exam);
        setQuestions(data.questions || []);

        if (data.existingSession && data.existingSession.status === "submitted") {
          setAlreadyCompleted(true);
          setResult({
            score: data.existingSession.score,
            percentage: data.existingSession.percentage,
          });
        }
      } catch (err: any) {
        setError(err.message || "Failed to load exam.");
      } finally {
        setLoading(false);
      }
    }

    loadExam();
  }, [reference, email, slug]);

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError("");

      const res = await fetch("/api/admissions/exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-apexium-tenant-slug": slug,
        },
        body: JSON.stringify({
          reference,
          email,
          slug,
          answers,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to submit exam.");
      }

      const data = await res.json();
      setResult({
        score: data.score,
        percentage: data.percentage,
      });
      setAlreadyCompleted(true);
    } catch (err: any) {
      setError(err.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Loading Entrance Assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      <header className="p-6 relative z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <BackNavigation href={`/s/${slug}/admissions/track`} label="Back to Application Tracker" />
          <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            Ref: {reference}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 relative z-10 w-full">
        {error ? (
          <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-2xl text-center space-y-4">
            <p className="text-rose-400 text-sm font-medium">{error}</p>
            <a
              href={`/s/${slug}/admissions/track`}
              className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
            >
              Return to Status Tracker
            </a>
          </div>
        ) : alreadyCompleted && result ? (
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-2xl">
              ✓
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Assessment Completed</h2>
              <p className="text-slate-400 text-sm">
                Your entrance exam submission has been recorded and attached to your admission application.
              </p>
            </div>

            <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800 flex justify-around">
              <div>
                <p className="text-xs text-slate-500 mb-1">Score</p>
                <p className="text-2xl font-bold text-white">{result.score} pts</p>
              </div>
              <div className="border-r border-slate-800" />
              <div>
                <p className="text-xs text-slate-500 mb-1">Percentage</p>
                <p className="text-2xl font-bold text-emerald-400">{result.percentage}%</p>
              </div>
            </div>

            <a
              href={`/s/${slug}/admissions/track`}
              className="inline-flex items-center justify-center w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
            >
              Return to Status Tracker
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Exam Header */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white">{exam?.title || "Entrance Assessment"}</h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Answer all questions carefully. Your score will be automatically recorded upon submission.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-lg">
                    {questions.length} Questions
                  </span>
                  {exam?.durationMinutes && (
                    <span className="text-xs font-semibold bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">
                      ⏱ {exam.durationMinutes} mins
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Questions Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-semibold text-white">
                      <span className="text-indigo-400 mr-2">Q{idx + 1}.</span> {q.questionText}
                    </p>
                    <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {q.marks} mark{q.marks > 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Options */}
                  {q.options && q.options.length > 0 ? (
                    <div className="space-y-2 pt-2">
                      {q.options.map((opt) => {
                        const isSelected = answers[q.id] === opt.id || answers[q.id] === opt.text;
                        return (
                          <button
                            type="button"
                            key={opt.id}
                            onClick={() => handleOptionSelect(q.id, opt.id)}
                            className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all flex items-center gap-3 ${
                              isSelected
                                ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm"
                                : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/40"
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? "border-indigo-400 bg-indigo-600" : "border-slate-600"
                              }`}
                            >
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                            <span>{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="pt-2">
                      <input
                        type="text"
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        placeholder="Type your answer here..."
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Assessment...</span>
                    </>
                  ) : (
                    <span>Submit Entrance Assessment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-slate-600 relative z-10">
        Powered by Apexium ERP • Secure Assessment Platform
      </footer>
    </div>
  );
}

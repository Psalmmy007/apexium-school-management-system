"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { BackNavigation } from "@/components/ui/BackNavigation";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Send,
} from "lucide-react";
import { tokens } from "@/lib/design-system/tokens";

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  questionText: string;
  questionType: "mcq" | "objective" | "theory";
  options?: Option[] | null;
  marks: number;
  order: number;
}

interface Exam {
  id: string;
  title: string;
  durationMinutes: number;
  totalMarks: number;
}

interface Session {
  id: string;
  examId: string;
  startedAt: string;
  status: "in_progress" | "submitted" | "timed_out";
  answers: Record<string, string>;
  score?: number | null;
  percentage?: string | null;
}

export default function TakeExamPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [tabSwitches, setTabSwitches] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Storage key for local offline resilience
  const localStorageKey = `cbt_answers_${sessionId}`;

  const fetchSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cbt/sessions?sessionId=${sessionId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setExam(json.data.exam);
        setSession(json.data.session);
        setQuestions(json.data.questions || []);

        const savedLocal = typeof window !== "undefined" ? localStorage.getItem(localStorageKey) : null;
        const initialAnswers = savedLocal ? JSON.parse(savedLocal) : json.data.session.answers || {};
        setAnswers(initialAnswers);

        // Calculate remaining seconds based on duration
        const startTime = new Date(json.data.session.startedAt).getTime();
        const durationSec = json.data.exam.durationMinutes * 60;
        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
        const left = Math.max(0, durationSec - elapsedSec);
        setRemainingSeconds(left);
      }
    } catch (err) {
      console.error("Failed to load CBT session", err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, localStorageKey]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Anti-cheat: Listen to page visibility / blur
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && session?.status === "in_progress") {
        setTabSwitches((prev) => prev + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [session]);

  const handleSubmitExam = useCallback(async (isAuto = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cbt/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          answers,
          tabSwitches,
          isAutoSubmit: isAuto,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSession(json.data.session);
        if (typeof window !== "undefined") {
          localStorage.removeItem(localStorageKey);
        }
      }
    } catch (err) {
      console.error("Failed to submit exam", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, sessionId, answers, tabSwitches, localStorageKey]);

  // Countdown timer
  useEffect(() => {
    if (loading || !session || session.status !== "in_progress") return;

    if (remainingSeconds <= 0) {
      handleSubmitExam(true);
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, session, remainingSeconds, handleSubmitExam]);

  // Save answer locally & sync
  const handleSelectOption = (questionId: string, optionId: string) => {
    const nextAnswers = { ...answers, [questionId]: optionId };
    setAnswers(nextAnswers);
    if (typeof window !== "undefined") {
      localStorage.setItem(localStorageKey, JSON.stringify(nextAnswers));
    }

    // Debounced sync
    setSyncing(true);
    fetch("/api/cbt/sessions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, answers: nextAnswers }),
    })
      .catch(console.error)
      .finally(() => setSyncing(false));
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 font-medium animate-pulse">
        Initializing CBT testing container...
      </div>
    );
  }

  if (!exam || !session) {
    return (
      <div className="p-8 max-w-lg mx-auto bg-slate-900 rounded-2xl border border-slate-800 text-center space-y-4">
        <p className="text-slate-300">Exam session could not be retrieved.</p>
        <button
          onClick={() => router.push("/dashboard/cbt")}
          className={tokens.btnPrimary}
        >
          Return to CBT Portal
        </button>
      </div>
    );
  }

  if (session.status === "submitted" || session.status === "timed_out") {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl text-center animate-fade-in">
        <div className="w-14 h-14 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-white">Exam Completed & Submitted</h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Your responses have been securely logged and processed by the automated grading system.
        </p>

        <div className="grid grid-cols-2 gap-4 bg-slate-950 p-5 rounded-xl border border-slate-800">
          <div>
            <span className="block text-xs uppercase font-bold text-slate-400">Total Score</span>
            <span className="text-3xl font-extrabold text-indigo-400 mt-1 block">
              {session.score ?? 0} / {exam.totalMarks}
            </span>
          </div>
          <div>
            <span className="block text-xs uppercase font-bold text-slate-400">Percentage</span>
            <span className="text-3xl font-extrabold text-emerald-400 mt-1 block">
              {session.percentage ?? "0.00"}%
            </span>
          </div>
        </div>

        <button
          onClick={() => router.push("/dashboard/cbt")}
          className={tokens.btnPrimary + " w-full sm:w-auto"}
        >
          Return to CBT Portal
        </button>
      </div>
    );
  }

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQ = questions[currentIdx];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <BackNavigation href="/dashboard/cbt" label="Back to CBT Portal" />

      {/* Top Bar: Exam Title, Timer, Anti-cheat status */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white">{exam.title}</h1>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
            <span>
              Question {currentIdx + 1} of {questions.length}
            </span>
            {syncing && <span className="text-indigo-400 animate-pulse font-medium">● Auto-Saving...</span>}
            {tabSwitches > 0 && (
              <span className="text-amber-400 font-semibold bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Tab switches: {tabSwitches}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-3.5 py-1.5 rounded-xl font-mono text-base font-bold flex items-center gap-2 border ${
              remainingSeconds < 300
                ? "bg-red-950/80 text-red-400 border-red-800 animate-pulse"
                : "bg-slate-950 text-indigo-400 border-slate-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          <ActionButton
            onClick={() => handleSubmitExam(false)}
            loading={isSubmitting}
            loadingText="Submitting…"
            variant="primary"
            className="text-xs py-2 px-4 min-h-[38px]"
            icon={<Send className="w-3.5 h-3.5" />}
          >
            Submit Exam
          </ActionButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Content Area */}
        <div className="lg:col-span-3 bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-md space-y-6">
          {currentQ && (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Question {currentIdx + 1} ({currentQ.marks} Mark{currentQ.marks > 1 ? "s" : ""})
                </span>
                <span className="text-xs text-slate-500 uppercase">{currentQ.questionType}</span>
              </div>

              <div className="text-base sm:text-lg text-white font-medium leading-relaxed">
                {currentQ.questionText}
              </div>

              {/* Options */}
              {currentQ.options && currentQ.options.length > 0 && (
                <div className="space-y-3 pt-2">
                  {currentQ.options.map((opt, idx) => {
                    const isSelected = answers[currentQ.id] === opt.id;
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectOption(currentQ.id, opt.id)}
                        className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition-all flex items-center gap-3.5 ${
                          isSelected
                            ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm"
                            : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="flex-1">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                <button
                  onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                  disabled={currentIdx === 0}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 transition flex items-center gap-1.5 min-h-[40px]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Previous
                </button>

                {currentIdx < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition flex items-center gap-1.5 min-h-[40px]"
                  >
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <ActionButton
                    onClick={() => handleSubmitExam(false)}
                    loading={isSubmitting}
                    loadingText="Submitting…"
                    variant="primary"
                    className="text-xs py-2.5 px-5 min-h-[40px]"
                  >
                    Finish Exam
                  </ActionButton>
                )}
              </div>
            </>
          )}
        </div>

        {/* Question Palette Sidebar */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4 h-fit">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Question Palette
          </h2>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.id]);
              const isCurrent = currentIdx === idx;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-9 rounded-lg font-bold text-xs transition border ${
                    isCurrent
                      ? "ring-2 ring-indigo-500 bg-indigo-600 text-white border-transparent"
                      : isAnswered
                      ? "bg-emerald-950/80 border-emerald-800 text-emerald-400"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-1.5 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-800" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-slate-950 border border-slate-800" />
              <span>Unanswered</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

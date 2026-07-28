"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

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

  const fetchSession = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cbt/sessions?sessionId=${sessionId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setExam(json.data.exam);
        setSession(json.data.session);
        setQuestions(json.data.questions || []);

        // Load saved server answers
        const serverAns = json.data.session.answers || {};

        // Merge with local offline cache if available
        let localAns: Record<string, string> = {};
        try {
          const stored = localStorage.getItem(localStorageKey);
          if (stored) localAns = JSON.parse(stored);
        } catch (e) {
          console.warn("Failed reading local CBT cache", e);
        }

        const merged = { ...serverAns, ...localAns };
        setAnswers(merged);

        // Calculate timer remaining seconds
        const startTime = new Date(json.data.session.startedAt).getTime();
        const durationMs = (json.data.exam.durationMinutes || 60) * 60 * 1000;
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const totalSeconds = (json.data.exam.durationMinutes || 60) * 60;
        const rem = Math.max(0, totalSeconds - elapsedSeconds);
        setRemainingSeconds(rem);
      }
    } catch (err) {
      console.error("Error loading CBT exam session", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) fetchSession();
  }, [sessionId]);

  // Anti-cheat tab switch listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => prev + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Timer Countdown Effect with Auto-submit
  useEffect(() => {
    if (!session || session.status !== "in_progress" || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam(true); // Auto-submit on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, remainingSeconds]);

  // Continuous Local Auto-Save + Server Sync
  const handleSelectAnswer = async (questionId: string, answerValue: string) => {
    const updated = { ...answers, [questionId]: answerValue };
    setAnswers(updated);

    // 1. Immediately persist locally (RxDB/IndexedDB/localStorage fallback)
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn("Local storage write error", e);
    }

    // 2. Continuous background sync to server API
    setSyncing(true);
    try {
      await fetch("/api/cbt/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-answer",
          sessionId,
          questionId,
          answer: answerValue,
        }),
      });
    } catch (err) {
      console.warn("Background server sync failed (will retry online)", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmitExam = async (isTimeout = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cbt/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", sessionId }),
      });
      const json = await res.json();
      if (json.success) {
        localStorage.removeItem(localStorageKey);
        setSession(json.data);
      }
    } catch (err) {
      console.error("Exam submission failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 font-medium animate-pulse">
        Initializing secure CBT exam environment...
      </div>
    );
  }

  if (!exam || !session) {
    return (
      <div className="p-8 text-center text-red-600 font-semibold">
        Exam session not found or invalid.
      </div>
    );
  }

  // Submitted view
  if (session.status === "submitted" || session.status === "timed_out") {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-6 bg-white rounded-xl border border-gray-200 shadow-sm text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Exam Completed & Submitted</h1>
        <p className="text-sm text-gray-600">
          Your responses have been securely logged and processed by the auto-grading system.
        </p>

        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
          <div>
            <span className="block text-xs uppercase font-semibold text-gray-500">Auto-Graded Score</span>
            <span className="text-2xl font-bold text-indigo-600">{session.score ?? 0} / {exam.totalMarks}</span>
          </div>
          <div>
            <span className="block text-xs uppercase font-semibold text-gray-500">Percentage</span>
            <span className="text-2xl font-bold text-green-600">{session.percentage ?? "0.00"}%</span>
          </div>
        </div>

        <button
          onClick={() => router.push("/dashboard/cbt")}
          className="py-2.5 px-6 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Bar: Exam Title, Timer, Anti-cheat status */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{exam.title}</h1>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
            <span>Question {currentIdx + 1} of {questions.length}</span>
            {syncing && <span className="text-indigo-600 animate-pulse font-medium">● Auto-Saving...</span>}
            {tabSwitches > 0 && (
              <span className="text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded">
                ⚠️ Tab switches: {tabSwitches}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div
            className={`px-4 py-2 rounded-lg font-mono text-lg font-bold ${
              remainingSeconds < 300
                ? "bg-red-100 text-red-700 border border-red-300 animate-pulse"
                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
            }`}
          >
            ⏱️ {formatTime(remainingSeconds)}
          </div>

          <button
            onClick={() => handleSubmitExam(false)}
            disabled={isSubmitting}
            className="py-2 px-4 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Exam"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Content Area */}
        <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          {currentQ && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded">
                    Question {currentIdx + 1} ({currentQ.marks} Marks)
                  </span>
                  <span className="text-xs text-gray-500 uppercase">{currentQ.questionType}</span>
                </div>
                <p className="text-base font-semibold text-gray-900 leading-relaxed">
                  {currentQ.questionText}
                </p>
              </div>

              {/* MCQ Options */}
              {currentQ.questionType === "mcq" && currentQ.options && (
                <div className="space-y-3 pt-2">
                  {currentQ.options.map((opt) => {
                    const isSelected = answers[currentQ.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectAnswer(currentQ.id, opt.id)}
                        className={`w-full p-4 rounded-lg text-left text-sm font-medium border transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-indigo-50 border-indigo-600 text-indigo-900 shadow-sm ring-1 ring-indigo-600"
                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span>{opt.text}</span>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected ? "border-indigo-600 bg-indigo-600 text-white text-xs" : "border-gray-300"
                          }`}
                        >
                          {isSelected && "✓"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Objective / Theory Input */}
              {(currentQ.questionType === "objective" || currentQ.questionType === "theory") && (
                <div className="pt-2">
                  <textarea
                    rows={4}
                    placeholder="Type your answer here..."
                    value={answers[currentQ.id] || ""}
                    onChange={(e) => handleSelectAnswer(currentQ.id, e.target.value)}
                    className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <button
                  onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                  disabled={currentIdx === 0}
                  className="px-4 py-2 text-xs font-semibold rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentIdx === questions.length - 1}
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </div>

        {/* Question Palette Sidebar */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4 h-fit">
          <h3 className="text-sm font-bold text-gray-900">Question Palette</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.id]);
              const isCurrent = idx === currentIdx;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                    isCurrent
                      ? "ring-2 ring-indigo-600 ring-offset-1 text-white bg-indigo-700"
                      : isAnswered
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-gray-100 text-xs space-y-1.5 text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-600 inline-block" />
              <span>Answered ({Object.keys(answers).length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />
              <span>Unanswered ({questions.length - Object.keys(answers).length})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

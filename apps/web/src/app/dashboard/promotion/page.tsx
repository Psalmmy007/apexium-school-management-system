"use client";

import { useEffect, useState } from "react";

interface ClassItem {
  id: string;
  name: string;
}

interface StudentItem {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  action: "promote" | "repeat" | "graduate";
  nextClassId?: string;
}

export default function PromotionPage() {
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [currentClassId, setCurrentClassId] = useState<string>("");
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [newSession, setNewSession] = useState<string>("2026/2027");

  const [studentRoster, setStudentRoster] = useState<StudentItem[]>([]);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (currentClassId) {
      fetchStudents(currentClassId);
    }
  }, [currentClassId]);

  async function fetchClasses() {
    try {
      const res = await fetch("/api/classes");
      const json = await res.json();
      if (json.success) {
        const cls = json.data.classes || [];
        setClassesList(cls);
        if (cls.length > 0) {
          setCurrentClassId(cls[0].id);
          if (cls.length > 1) setTargetClassId(cls[1].id);
        }
      }
    } catch (err) {
      setErrorMsg("Failed to load classes list");
    }
  }

  async function fetchStudents(classId: string) {
    setLoadingRoster(true);
    try {
      const res = await fetch(`/api/students?classId=${classId}`);
      const json = await res.json();
      if (json.success) {
        const list = (json.data.students || []).map((s: any) => ({
          id: s.id,
          admissionNumber: s.admissionNumber,
          firstName: s.firstName,
          lastName: s.lastName,
          action: "promote" as const,
        }));
        setStudentRoster(list);
      }
    } catch (err) {
      setErrorMsg("Failed to fetch class roster");
    } finally {
      setLoadingRoster(false);
    }
  }

  function handleActionChange(studentId: string, action: "promote" | "repeat" | "graduate") {
    setStudentRoster((prev) =>
      prev.map((st) => (st.id === studentId ? { ...st, action } : st))
    );
  }

  const promoteCount = studentRoster.filter((s) => s.action === "promote").length;
  const repeatCount = studentRoster.filter((s) => s.action === "repeat").length;
  const graduateCount = studentRoster.filter((s) => s.action === "graduate").length;

  async function handleConfirmPromotion() {
    setExecuting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/promotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentClassId,
          targetClassId,
          newSession,
          studentActions: studentRoster.map((s) => ({
            studentId: s.id,
            action: s.action,
            nextClassId: s.action === "repeat" ? currentClassId : targetClassId,
          })),
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setErrorMsg(json.error || "Failed to execute promotion");
      } else {
        setSuccessMsg(
          `Promotion completed successfully! Promoted: ${json.data.promotedCount}, Repeated: ${json.data.repeatedCount}, Graduated: ${json.data.graduatedCount}.`
        );
        setShowConfirmModal(false);
        fetchStudents(currentClassId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error executing promotion");
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </span>
            Student Promotion & Session Rollover
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Bulk-promote students, handle class repeats or graduations, while preserving prior-term academic history.
          </p>
        </div>

        {/* Action Summary Pill */}
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold">
          <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            Promote: {promoteCount}
          </span>
          <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            Repeat: {repeatCount}
          </span>
          <span className="text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
            Graduate: {graduateCount}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-3">
          <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p>{successMsg}</p>
        </div>
      )}

      {/* ── Selection Parameters Bar ─────────────────────────── */}
      <div className="card shadow-sm border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5">
        <div>
          <label className="label">Current Class (From)</label>
          <select
            value={currentClassId}
            onChange={(e) => setCurrentClassId(e.target.value)}
            className="input font-semibold text-slate-800 cursor-pointer"
          >
            {classesList.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Promote To Class (Target)</label>
          <select
            value={targetClassId}
            onChange={(e) => setTargetClassId(e.target.value)}
            className="input font-semibold text-indigo-700 cursor-pointer"
          >
            <option value="">None (Graduating Class)</option>
            {classesList.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">New Academic Session</label>
          <input
            type="text"
            value={newSession}
            onChange={(e) => setNewSession(e.target.value)}
            placeholder="e.g. 2026/2027"
            className="input font-semibold text-slate-800"
          />
        </div>
      </div>

      {/* ── Roster Action Table Matrix ───────────────────────── */}
      <div className="table-container shadow-md border-slate-200 bg-white">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <h2 className="font-bold text-base">Class Roster Promotion Matrix</h2>
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={studentRoster.length === 0 || executing}
            className="btn btn-primary bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold shadow-md"
          >
            Execute Session Promotion ({studentRoster.length} Students)
          </button>
        </div>

        {loadingRoster ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">
            Loading class roster...
          </div>
        ) : studentRoster.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No active students found in selected class.
          </div>
        ) : (
          <table className="table w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3">Admission No</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3 text-center">Promotion Action</th>
              </tr>
            </thead>
            <tbody>
              {studentRoster.map((st) => (
                <tr key={st.id} className="hover:bg-slate-50/60 border-b border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 font-bold">
                    {st.admissionNumber}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {st.firstName} {st.lastName}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleActionChange(st.id, "promote")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          st.action === "promote"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Promote
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionChange(st.id, "repeat")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          st.action === "repeat"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Repeat
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionChange(st.id, "graduate")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          st.action === "graduate"
                            ? "bg-sky-600 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Graduate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Confirmation Modal ───────────────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4">
              <h3 className="font-bold text-lg">Confirm Session Promotion</h3>
              <p className="text-xs text-slate-400">
                Execute session transition for session {newSession}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-sm space-y-2">
                <p className="font-bold text-indigo-900">Summary of Rollover Actions:</p>
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-slate-700">
                  <div className="bg-white p-2 rounded border border-indigo-200 text-center">
                    <span className="block text-emerald-600 font-bold text-base">{promoteCount}</span>
                    Promote
                  </div>
                  <div className="bg-white p-2 rounded border border-indigo-200 text-center">
                    <span className="block text-amber-600 font-bold text-base">{repeatCount}</span>
                    Repeat
                  </div>
                  <div className="bg-white p-2 rounded border border-indigo-200 text-center">
                    <span className="block text-sky-600 font-bold text-base">{graduateCount}</span>
                    Graduate
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                ℹ️ Prior-term academic records, attendance logs, and report card grades remain permanently preserved and fully queryable after promotion.
              </p>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="btn btn-ghost text-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPromotion}
                  disabled={executing}
                  className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold"
                >
                  {executing ? "Processing Rollover..." : "Confirm & Execute Promotion"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

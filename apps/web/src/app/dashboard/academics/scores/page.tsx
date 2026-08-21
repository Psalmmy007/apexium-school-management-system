"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { BackNavigation } from "@/components/ui/BackNavigation";
import { calculateGrade } from "@apexium/db";
import {
  GraduationCap,
  Save,
  Download,
  CheckCircle,
  AlertCircle,
  Sparkles,
  LayoutGrid,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface ClassItem {
  id: string;
  name: string;
}

interface SubjectItem {
  id: string;
  name: string;
  code?: string;
}

interface TermItem {
  id: string;
  name: string;
  session: string;
  isCurrent?: boolean;
}

interface StudentItem {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
}

interface ScoreCell {
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  remarks?: string;
}

export default function ScoreMatrixSpreadsheetPage() {
  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [subjectList, setSubjectList] = useState<SubjectItem[]>([]);
  const [termList, setTermList] = useState<TermItem[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");

  const [viewMode, setViewMode] = useState<"matrix" | "subject_focus">("matrix");
  const [activeSubjectId, setActiveSubjectId] = useState("");

  const [students, setStudents] = useState<StudentItem[]>([]);
  // matrix: matrix[studentId][subjectId] = ScoreCell
  const [matrix, setMatrix] = useState<Record<string, Record<string, ScoreCell>>>({});

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // 1. Load Classes, Terms, and Subjects on Mount
  useEffect(() => {
    async function loadMetadata() {
      setInitialLoading(true);
      try {
        const [classRes, termRes, subjectRes] = await Promise.all([
          fetch("/api/classes").then((r) => r.json()),
          fetch("/api/terms").then((r) => r.json()),
          fetch("/api/subjects").then((r) => r.json()),
        ]);

        if (classRes.success && classRes.data.classes?.length > 0) {
          const classes = classRes.data.classes as ClassItem[];
          setClassList(classes);
          setSelectedClassId(classes[0].id);
        }

        if (termRes.success && termRes.data?.length > 0) {
          const terms = termRes.data as TermItem[];
          setTermList(terms);
          const current = terms.find((t) => t.isCurrent) || terms[0];
          setSelectedTermId(current.id);
        }

        if (subjectRes.success && subjectRes.data?.length > 0) {
          setSubjectList(subjectRes.data);
          setActiveSubjectId(subjectRes.data[0].id);
        }
      } catch (err) {
        console.warn("Failed loading metadata", err);
      } finally {
        setInitialLoading(false);
      }
    }
    loadMetadata();
  }, []);

  // 2. Fetch Complete Matrix when Class or Term changes
  useEffect(() => {
    async function loadMatrix() {
      if (!selectedClassId || !selectedTermId) return;
      setLoadingMatrix(true);
      setStatusMessage(null);

      try {
        const res = await fetch(
          `/api/scores/matrix?classId=${selectedClassId}&termId=${selectedTermId}`
        );
        const json = await res.json();
        if (json.success) {
          setStudents(json.data.students || []);
          if (json.data.subjects && json.data.subjects.length > 0) {
            setSubjectList(json.data.subjects);
            if (!activeSubjectId) setActiveSubjectId(json.data.subjects[0].id);
          }
          setMatrix(json.data.scoreMatrix || {});
          setDirty(false);
        } else {
          setStatusMessage({ type: "error", text: json.error || "Failed to load matrix." });
        }
      } catch (err: any) {
        setStatusMessage({ type: "error", text: err.message || "Failed to load scores." });
      } finally {
        setLoadingMatrix(false);
      }
    }

    loadMatrix();
  }, [selectedClassId, selectedTermId]);

  // Handle Score Input Change in Cell
  function handleCellChange(
    studentId: string,
    subjectId: string,
    field: "caScore" | "examScore",
    rawValue: string
  ) {
    const num = Math.max(0, Number(rawValue) || 0);
    const capped = field === "caScore" ? Math.min(40, num) : Math.min(60, num);

    setMatrix((prev) => {
      const studentMap = prev[studentId] || {};
      const currentCell = studentMap[subjectId] || {
        caScore: 0,
        examScore: 0,
        totalScore: 0,
        grade: "F9",
      };

      const newCA = field === "caScore" ? capped : currentCell.caScore;
      const newExam = field === "examScore" ? capped : currentCell.examScore;
      const totalScore = newCA + newExam;
      const { grade, remark } = calculateGrade(totalScore);

      return {
        ...prev,
        [studentId]: {
          ...studentMap,
          [subjectId]: {
            ...currentCell,
            caScore: newCA,
            examScore: newExam,
            totalScore,
            grade,
            remarks: remark,
          },
        },
      };
    });

    setDirty(true);
  }

  // Calculate Aggregates per Student across all subjects
  const studentSummaries = useMemo(() => {
    return students.map((student) => {
      const studentScores = matrix[student.id] || {};
      let totalMarks = 0;
      let subjectCount = 0;

      subjectList.forEach((subj) => {
        const cell = studentScores[subj.id];
        if (cell && (cell.totalScore > 0 || cell.caScore > 0 || cell.examScore > 0)) {
          totalMarks += cell.totalScore;
          subjectCount++;
        }
      });

      const average = subjectCount > 0 ? Math.round((totalMarks / subjectCount) * 10) / 10 : 0;
      const { grade: overallGrade } = calculateGrade(average);

      return {
        studentId: student.id,
        totalMarks,
        subjectCount,
        average,
        overallGrade,
      };
    });
  }, [students, matrix, subjectList]);

  // Save All Scores in 1 Click
  async function handleSaveMatrix() {
    if (!selectedClassId || !selectedTermId) return;

    setSaving(true);
    setStatusMessage(null);

    const updates: Array<{
      studentId: string;
      subjectId: string;
      caScore: number;
      examScore: number;
    }> = [];

    students.forEach((st) => {
      const stMap = matrix[st.id] || {};
      subjectList.forEach((subj) => {
        const cell = stMap[subj.id];
        if (cell) {
          updates.push({
            studentId: st.id,
            subjectId: subj.id,
            caScore: cell.caScore,
            examScore: cell.examScore,
          });
        }
      });
    });

    try {
      const res = await fetch("/api/scores/matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          termId: selectedTermId,
          updates,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setStatusMessage({
          type: "success",
          text: `All class scores saved successfully! (${json.savedCount} records recorded)`,
        });
        setDirty(false);
      } else {
        setStatusMessage({ type: "error", text: json.error || "Failed to save scores." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to save scores." });
    } finally {
      setSaving(false);
    }
  }

  // Export Matrix to CSV
  function handleExportCSV() {
    if (students.length === 0 || subjectList.length === 0) return;

    const headers = ["Admission No", "Student Name"];
    subjectList.forEach((s) => {
      headers.push(`${s.name} CA (40)`, `${s.name} Exam (60)`, `${s.name} Total`, `${s.name} Grade`);
    });
    headers.push("Cumulative Marks", "Average Score", "Overall Grade");

    const rows = students.map((st) => {
      const summary = studentSummaries.find((s) => s.studentId === st.id);
      const stMap = matrix[st.id] || {};
      const rowData = [st.admissionNumber, `"${st.lastName}, ${st.firstName}"`];

      subjectList.forEach((subj) => {
        const cell = stMap[subj.id] || { caScore: 0, examScore: 0, totalScore: 0, grade: "F9" };
        rowData.push(
          cell.caScore.toString(),
          cell.examScore.toString(),
          cell.totalScore.toString(),
          cell.grade
        );
      });

      rowData.push(
        (summary?.totalMarks ?? 0).toString(),
        (summary?.average ?? 0).toString(),
        summary?.overallGrade ?? "F9"
      );

      return rowData.join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const selectedClassName = classList.find((c) => c.id === selectedClassId)?.name || "Class";
    link.setAttribute("download", `Scoresheet_${selectedClassName.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const selectedClass = classList.find((c) => c.id === selectedClassId);
  const selectedTerm = termList.find((t) => t.id === selectedTermId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back to Dashboard */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            Academic Grades & Scoresheet Matrix
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Full-class spreadsheet matrix for rapid CA and Exam mark entry with live WAEC/NECO grade computation.
          </p>
        </div>

        {/* Global Save & Export Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={students.length === 0}
            className="btn-secondary btn-sm text-xs flex items-center gap-1.5"
            title="Download CSV Spreadsheet"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleSaveMatrix}
            disabled={saving || students.length === 0}
            className={`btn-primary btn-sm text-xs font-bold flex items-center gap-1.5 shadow-md ${
              dirty ? "ring-2 ring-indigo-400 animate-pulse" : ""
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving Matrix..." : dirty ? "Save Changes *" : "Save All Scores"}
          </button>
        </div>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center gap-3 shadow-xs ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              : statusMessage.type === "error"
              ? "bg-red-500/10 border border-red-500/30 text-red-300"
              : "bg-indigo-500/10 border border-indigo-500/30 text-indigo-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <p>{statusMessage.text}</p>
        </div>
      )}

      {/* ── SELECTOR BAR (Select Class & Term Once) ───────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Class Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Class:
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-slate-800 text-white py-2 px-3 text-xs font-bold border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {classList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Term Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Term:
            </label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="bg-slate-800 text-white py-2 px-3 text-xs font-bold border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {termList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.session}) {t.isCurrent ? "★ Active" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setViewMode("matrix")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              viewMode === "matrix"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Full Class Matrix
          </button>
          <button
            type="button"
            onClick={() => setViewMode("subject_focus")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              viewMode === "subject_focus"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Subject Tab Mode
          </button>
        </div>
      </div>

      {/* ── LOADING & EMPTY STATES ────────────────────────────────────────── */}
      {initialLoading || loadingMatrix ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center text-slate-400 animate-pulse space-y-2">
          <FileSpreadsheet className="w-8 h-8 text-indigo-400 mx-auto opacity-60" />
          <p className="text-sm font-semibold text-white">Loading Class Scoresheet Matrix...</p>
          <p className="text-xs text-slate-500">Preparing student rows, subject columns, and WAEC grading rules.</p>
        </div>
      ) : classList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <GraduationCap className="w-10 h-10 text-indigo-400 mx-auto opacity-70" />
          <p className="text-base font-bold text-white">No Classes Registered</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Configure school classes to begin recording academic marks.
          </p>
          <a
            href="/dashboard/setup"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
          >
            Go to Setup Wizard →
          </a>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto text-xl font-bold">
            👥
          </div>
          <p className="text-base font-bold text-white">No Students Enrolled in {selectedClass?.name}</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Enroll students into this class from the Student Information System to start entering marks.
          </p>
          <a
            href="/dashboard/students/new"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
          >
            Register Student →
          </a>
        </div>
      ) : (
        <>
          {/* ── VIEW MODE 1: FULL SPREADSHEET MATRIX (All Subjects at Once) ──── */}
          {viewMode === "matrix" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    {selectedClass?.name} Scoresheet Matrix
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({students.length} students · {subjectList.length} subjects)
                  </span>
                </div>
                <div className="text-[11px] text-indigo-300 font-mono">
                  Scale: CA (0–40) + Exam (0–60) = 100
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="py-3 px-3 w-10 text-center sticky left-0 bg-slate-950 z-20 border-r border-slate-800">
                        #
                      </th>
                      <th className="py-3 px-4 min-w-44 sticky left-10 bg-slate-950 z-20 border-r border-slate-800">
                        Student Name
                      </th>

                      {/* Subject Header Columns (CA | Exam | Tot | Grd) */}
                      {subjectList.map((subj) => (
                        <th
                          key={subj.id}
                          className="py-2.5 px-3 text-center border-r border-slate-800 min-w-40"
                        >
                          <div className="font-bold text-white truncate max-w-[140px] mx-auto">
                            {subj.name}
                          </div>
                          <div className="grid grid-cols-4 gap-1 text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-800">
                            <span>CA</span>
                            <span>EX</span>
                            <span>TOT</span>
                            <span>GRD</span>
                          </div>
                        </th>
                      ))}

                      {/* Summary Columns */}
                      <th className="py-3 px-3 text-center bg-slate-950 min-w-24 border-r border-slate-800">
                        Total Marks
                      </th>
                      <th className="py-3 px-3 text-center bg-slate-950 min-w-24">
                        Average / Grade
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/80 font-medium">
                    {students.map((student, idx) => {
                      const summary = studentSummaries.find((s) => s.studentId === student.id);
                      const stScores = matrix[student.id] || {};

                      return (
                        <tr key={student.id} className="hover:bg-slate-800/40 transition">
                          {/* Row Number */}
                          <td className="py-3 px-3 text-center text-slate-500 font-mono sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                            {idx + 1}
                          </td>

                          {/* Student Name & Admission No */}
                          <td className="py-3 px-4 sticky left-10 bg-slate-900 border-r border-slate-800 z-10">
                            <p className="font-bold text-white truncate">
                              {student.lastName}, {student.firstName}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400">
                              {student.admissionNumber}
                            </p>
                          </td>

                          {/* Subject Cells */}
                          {subjectList.map((subj) => {
                            const cell = stScores[subj.id] || {
                              caScore: 0,
                              examScore: 0,
                              totalScore: 0,
                              grade: "F9",
                            };

                            const isDistinction = cell.grade === "A1" || cell.grade === "B2";
                            const isFail = cell.grade === "F9";

                            return (
                              <td
                                key={subj.id}
                                className="py-2 px-2 border-r border-slate-800/80 text-center"
                              >
                                <div className="grid grid-cols-4 gap-1 items-center font-mono">
                                  {/* CA Input */}
                                  <input
                                    type="number"
                                    min={0}
                                    max={40}
                                    value={cell.caScore || ""}
                                    placeholder="0"
                                    onChange={(e) =>
                                      handleCellChange(student.id, subj.id, "caScore", e.target.value)
                                    }
                                    className="w-full bg-slate-950 border border-slate-800 rounded text-center py-1 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    title="Continuous Assessment (Max 40)"
                                  />

                                  {/* Exam Input */}
                                  <input
                                    type="number"
                                    min={0}
                                    max={60}
                                    value={cell.examScore || ""}
                                    placeholder="0"
                                    onChange={(e) =>
                                      handleCellChange(student.id, subj.id, "examScore", e.target.value)
                                    }
                                    className="w-full bg-slate-950 border border-slate-800 rounded text-center py-1 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    title="Term Exam (Max 60)"
                                  />

                                  {/* Total Auto */}
                                  <span className="font-bold text-slate-200 text-xs">
                                    {cell.totalScore}
                                  </span>

                                  {/* WAEC Letter Grade */}
                                  <span
                                    className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                                      isDistinction
                                        ? "bg-emerald-500/20 text-emerald-300"
                                        : isFail
                                        ? "bg-rose-500/20 text-rose-300"
                                        : "bg-indigo-500/20 text-indigo-300"
                                    }`}
                                  >
                                    {cell.grade}
                                  </span>
                                </div>
                              </td>
                            );
                          })}

                          {/* Cumulative Marks */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-white bg-slate-950/40 border-r border-slate-800">
                            {summary?.totalMarks ?? 0}
                          </td>

                          {/* Average Score & Overall Grade */}
                          <td className="py-3 px-3 text-center bg-slate-950/40 font-mono">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-bold text-white">{summary?.average ?? 0}%</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  summary?.overallGrade === "A1"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : summary?.overallGrade === "F9"
                                    ? "bg-rose-500/20 text-rose-300"
                                    : "bg-indigo-500/20 text-indigo-300"
                                }`}
                              >
                                {summary?.overallGrade ?? "F9"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── VIEW MODE 2: SUBJECT TAB FOCUS MODE ──────────────────────────── */}
          {viewMode === "subject_focus" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-5 space-y-5">
              {/* Subject Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800">
                {subjectList.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSubjectId(s.id)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                      activeSubjectId === s.id
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>

              {/* Single Subject Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Admission No</th>
                      <th className="py-3 px-4 w-32">CA Score (40)</th>
                      <th className="py-3 px-4 w-32">Exam Score (60)</th>
                      <th className="py-3 px-4 w-28 text-center">Total (100)</th>
                      <th className="py-3 px-4 w-24 text-center">Grade</th>
                      <th className="py-3 px-4">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-medium">
                    {students.map((student, idx) => {
                      const cell = matrix[student.id]?.[activeSubjectId] || {
                        caScore: 0,
                        examScore: 0,
                        totalScore: 0,
                        grade: "F9",
                        remarks: "Fail",
                      };

                      return (
                        <tr key={student.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 text-center text-slate-500 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            {student.lastName}, {student.firstName}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-400">
                            {student.admissionNumber}
                          </td>
                          <td className="py-3.5 px-4">
                            <input
                              type="number"
                              min={0}
                              max={40}
                              value={cell.caScore || ""}
                              placeholder="0"
                              onChange={(e) =>
                                handleCellChange(student.id, activeSubjectId, "caScore", e.target.value)
                              }
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="py-3.5 px-4">
                            <input
                              type="number"
                              min={0}
                              max={60}
                              value={cell.examScore || ""}
                              placeholder="0"
                              onChange={(e) =>
                                handleCellChange(student.id, activeSubjectId, "examScore", e.target.value)
                              }
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-white text-sm">
                            {cell.totalScore}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                cell.grade === "A1"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : cell.grade === "F9"
                                  ? "bg-rose-500/20 text-rose-300"
                                  : "bg-indigo-500/20 text-indigo-300"
                              }`}
                            >
                              {cell.grade}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-medium">
                            {cell.remarks || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

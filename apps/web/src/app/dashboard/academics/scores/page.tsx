"use client";

import { useState, useEffect } from "react";
import { BackNavigation } from "@/components/ui/BackNavigation";

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
}

interface StudentScoreRow {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  caScore: number; // Max 40
  examScore: number; // Max 60
  totalScore: number; // Max 100
  remarks?: string;
}

export default function ScoreEntryPage() {
  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [subjectList, setSubjectList] = useState<SubjectItem[]>([]);
  const [termList, setTermList] = useState<TermItem[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");

  const [scores, setScores] = useState<StudentScoreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load classes, subjects, terms
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [classRes, subjectRes] = await Promise.all([
          fetch("/api/classes"),
          fetch("/api/subjects"),
        ]);
        const classJson = await classRes.json();
        const subjectJson = await subjectRes.json();

        if (classJson.success) setClassList(classJson.data.classes || []);
        if (subjectJson.success) setSubjectList(subjectJson.data || []);
      } catch (err) {
        console.warn("Error loading metadata", err);
      }
    }
    loadMetadata();
  }, []);

  // Fetch student scores when filter selections change
  useEffect(() => {
    async function loadScores() {
      if (!selectedClassId || !selectedSubjectId || !selectedTermId) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/scores?classId=${selectedClassId}&subjectId=${selectedSubjectId}&termId=${selectedTermId}`
        );
        const json = await res.json();
        if (json.success) {
          setScores(json.data.items || []);
        }
      } catch (err) {
        console.error("Failed to load scores", err);
      } finally {
        setLoading(false);
      }
    }
    loadScores();
  }, [selectedClassId, selectedSubjectId, selectedTermId]);

  function handleScoreChange(
    studentId: string,
    field: "caScore" | "examScore",
    val: number
  ) {
    setScores((prev) =>
      prev.map((item) => {
        if (item.studentId === studentId) {
          const caScore = field === "caScore" ? Math.min(40, Math.max(0, val)) : item.caScore;
          const examScore = field === "examScore" ? Math.min(60, Math.max(0, val)) : item.examScore;
          return {
            ...item,
            caScore,
            examScore,
            totalScore: caScore + examScore,
          };
        }
        return item;
      })
    );
  }

  async function handleSave() {
    setSaving(true);
    setStatusMessage("Saving scores register...");

    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          termId: selectedTermId,
          scores,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setStatusMessage(`Successfully saved scores for ${json.data.savedCount} students!`);
      } else {
        setStatusMessage(json.error || "Failed to save scores");
      }
    } catch (err: any) {
      setStatusMessage(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back to Dashboard Navigation */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      <div>
        <h1 className="text-2xl font-bold text-white">Score & Assessment Entry</h1>
        <p className="text-sm text-slate-400 mt-1">
          Record Continuous Assessment (CA max 40) and Examination (Exam max 60) scores per subject and term.
        </p>
      </div>

      {/* Filter Card */}
      <div className="card grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="label">Select Class *</label>
          <select
            id="score-select-class"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="input"
          >
            <option value="">Choose Class</option>
            {classList.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Select Subject *</label>
          <select
            id="score-select-subject"
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="input"
          >
            <option value="">Choose Subject</option>
            {subjectList.map((subj) => (
              <option key={subj.id} value={subj.id}>
                {subj.name} ({subj.code || "SUBJ"})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Select Term *</label>
          <select
            id="score-select-term"
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="input"
          >
            <option value="">Choose Term</option>
            <option value="term-1-2025">First Term 2025/2026</option>
            <option value="term-2-2025">Second Term 2025/2026</option>
            <option value="term-3-2025">Third Term 2025/2026</option>
          </select>
        </div>
      </div>

      {/* Score Entry Table */}
      {selectedClassId && selectedSubjectId && selectedTermId && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <span className="text-sm font-semibold text-slate-700">
              Student Assessment Sheet ({scores.length} Students)
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Loading roster & scores...</div>
          ) : scores.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No active students found in this class.
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Admission No</th>
                    <th className="w-32 text-center">CA Score (40%)</th>
                    <th className="w-32 text-center">Exam Score (60%)</th>
                    <th className="w-28 text-center">Total (100%)</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((st) => (
                    <tr key={st.studentId}>
                      <td className="font-semibold text-slate-900">
                        {st.lastName}, {st.firstName}
                      </td>
                      <td className="font-mono text-xs text-slate-500">
                        {st.admissionNumber}
                      </td>
                      <td className="text-center">
                        <input
                          type="number"
                          min={0}
                          max={40}
                          value={st.caScore}
                          onChange={(e) =>
                            handleScoreChange(st.studentId, "caScore", parseFloat(e.target.value) || 0)
                          }
                          className="input text-center font-bold text-slate-900 w-24 py-1"
                        />
                      </td>
                      <td className="text-center">
                        <input
                          type="number"
                          min={0}
                          max={60}
                          value={st.examScore}
                          onChange={(e) =>
                            handleScoreChange(st.studentId, "examScore", parseFloat(e.target.value) || 0)
                          }
                          className="input text-center font-bold text-slate-900 w-24 py-1"
                        />
                      </td>
                      <td className="text-center">
                        <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-sm">
                          {st.totalScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer Submit */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs text-slate-500">
              {statusMessage || "Enter scores and click Save"}
            </span>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || scores.length === 0}
              className="btn-primary"
            >
              {saving ? "Saving Scores..." : "Save Assessment Register"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

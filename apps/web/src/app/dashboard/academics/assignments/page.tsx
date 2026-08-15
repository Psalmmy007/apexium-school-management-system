"use client";

import { useEffect, useState, useCallback } from "react";
import { BackNavigation } from "@/components/ui/BackNavigation";
import type { LmsAssignment, LmsSubmission } from "@apexium/types";

interface OptionItem {
  id: string;
  name: string;
}

export default function LmsAssignmentsPage() {
  const [assignments, setAssignments] = useState<LmsAssignment[]>([]);
  const [classes, setClasses] = useState<OptionItem[]>([]);
  const [subjects, setSubjects] = useState<OptionItem[]>([]);
  const [terms, setTerms] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected assignment for submit/grading modal
  const [activeAssignment, setActiveAssignment] = useState<LmsAssignment | null>(null);
  const [submissions, setSubmissions] = useState<LmsSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState<boolean>(false);

  // Submission input
  const [submissionText, setSubmissionText] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Grading input
  const [gradingScoreMap, setGradingScoreMap] = useState<Record<string, number>>({});
  const [gradingFeedbackMap, setGradingFeedbackMap] = useState<Record<string, string>>({});
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);

  // Create Assignment Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [newSubjectId, setNewSubjectId] = useState<string>("");
  const [newClassId, setNewClassId] = useState<string>("");
  const [newTermId, setNewTermId] = useState<string>("");
  const [newDueAt, setNewDueAt] = useState<string>("");
  const [newTotalMarks, setNewTotalMarks] = useState<number>(20);
  const [saving, setSaving] = useState<boolean>(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchInitialOptions = async () => {
    try {
      const res = await fetch("/api/timetable/options");
      const json = await res.json();
      if (json.success && json.data) {
        setClasses(json.data.classes || []);
        setSubjects(json.data.subjects || []);
        setTerms(json.data.terms || []);
        if (json.data.terms && json.data.terms.length > 0) {
          setNewTermId(json.data.terms[0].id);
        }
      }
    } catch (e) {
      console.error("Failed loading options", e);
    }
  };

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lms/assignments");
      const json = await res.json();
      if (json.success) {
        setAssignments(json.data || []);
      }
    } catch (e) {
      console.error("Failed fetching assignments", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialOptions();
    fetchAssignments();
  }, [fetchAssignments]);

  const handleOpenAssignment = async (asg: LmsAssignment) => {
    setActiveAssignment(asg);
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/lms/submissions?assignmentId=${asg.id}`);
      const json = await res.json();
      if (json.success) {
        setSubmissions(json.data || []);
        // Populate score map for grading
        const sMap: Record<string, number> = {};
        const fMap: Record<string, string> = {};
        (json.data || []).forEach((sub: LmsSubmission) => {
          if (sub.score !== null && sub.score !== undefined) sMap[sub.id] = sub.score;
          if (sub.feedback) fMap[sub.id] = sub.feedback;
        });
        setGradingScoreMap(sMap);
        setGradingFeedbackMap(fMap);
      }
    } catch (e) {
      console.error("Failed fetching submissions", e);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDescription || !newSubjectId || !newClassId || !newTermId || !newDueAt) {
      setMessage({ type: "error", text: "Please fill in all required fields." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/lms/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          subjectId: newSubjectId,
          classId: newClassId,
          termId: newTermId,
          dueAt: newDueAt,
          totalMarks: newTotalMarks,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Assignment created successfully!" });
        setShowCreateModal(false);
        setNewTitle("");
        setNewDescription("");
        fetchAssignments();
      } else {
        setMessage({ type: "error", text: json.error || "Failed to create assignment." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error saving assignment." });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!activeAssignment || !submissionText.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/lms/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          assignmentId: activeAssignment.id,
          submissionText,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Assignment submitted successfully!" });
        setSubmissionText("");
        handleOpenAssignment(activeAssignment);
      } else {
        setMessage({ type: "error", text: json.error || "Failed to submit assignment." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error submitting assignment." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGradeSubmission = async (subId: string) => {
    const score = gradingScoreMap[subId];
    if (score === undefined) return;
    setGradingSubId(subId);
    setMessage(null);
    try {
      const res = await fetch("/api/lms/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grade",
          submissionId: subId,
          score: Number(score),
          feedback: gradingFeedbackMap[subId] || "",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Submission graded & synced to Academic Gradebook!" });
        if (activeAssignment) handleOpenAssignment(activeAssignment);
      } else {
        setMessage({ type: "error", text: json.error || "Failed to grade submission." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error grading submission." });
    } finally {
      setGradingSubId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back to Dashboard Navigation */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Assignments & Submissions</h1>
          <p className="text-sm text-slate-400 mt-1">
            Create tasks, submit student work, and grade directly into the core Academic Gradebook.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Assignment
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium ${
            message.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Assignment List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Loading assignments...</div>
      ) : assignments.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <p className="text-slate-500 font-medium">No assignments found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignments.map((asg) => (
            <div key={asg.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded">
                    Total Marks: {asg.totalMarks}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    Due: {new Date(asg.dueAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{asg.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">{asg.description}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleOpenAssignment(asg)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  View / Submit / Grade →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Assignment Drawer/Modal */}
      {activeAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{activeAssignment.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Due: {new Date(activeAssignment.dueAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setActiveAssignment(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 leading-relaxed">
              {activeAssignment.description}
            </div>

            {/* Student Submission Section */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Student Submission</h3>
              <textarea
                rows={4}
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="Type your assignment answer response here..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSubmitAssignment}
                disabled={submitting || !submissionText.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Response"}
              </button>
            </div>

            {/* Teacher Submissions Grading List */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Submissions to Grade (Teacher View)
              </h3>
              {loadingSubmissions ? (
                <div className="p-4 text-center text-slate-400 text-xs">Loading submissions...</div>
              ) : submissions.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">No student submissions yet.</div>
              ) : (
                <div className="space-y-4">
                  {submissions.map((sub) => (
                    <div key={sub.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Submitted: {new Date(sub.submittedAt).toLocaleString()}</span>
                        <span className={`font-bold px-2 py-0.5 rounded ${sub.status === "graded" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          {sub.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800 whitespace-pre-line bg-white p-3 rounded-lg border border-slate-200">
                        {sub.submissionText || "No text payload"}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Score (Max {activeAssignment.totalMarks})</label>
                          <input
                            type="number"
                            max={activeAssignment.totalMarks}
                            min={0}
                            value={gradingScoreMap[sub.id] ?? ""}
                            onChange={(e) => setGradingScoreMap({ ...gradingScoreMap, [sub.id]: Number(e.target.value) })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-600 mb-1">Teacher Feedback</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={gradingFeedbackMap[sub.id] || ""}
                              onChange={(e) => setGradingFeedbackMap({ ...gradingFeedbackMap, [sub.id]: e.target.value })}
                              placeholder="Feedback remarks..."
                              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium"
                            />
                            <button
                              onClick={() => handleGradeSubmission(sub.id)}
                              disabled={gradingSubId === sub.id}
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm disabled:opacity-50"
                            >
                              {gradingSubId === sub.id ? "Saving..." : "Save Grade"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Create New Assignment</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assignment Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Midterm Essay on Chemical Kinetics"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Class *</label>
                  <select
                    required
                    value={newClassId}
                    onChange={(e) => setNewClassId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subject *</label>
                  <select
                    required
                    value={newSubjectId}
                    onChange={(e) => setNewSubjectId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Term *</label>
                  <select
                    required
                    value={newTermId}
                    onChange={(e) => setNewTermId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                  >
                    <option value="">Select Term</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Due Date *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newDueAt}
                    onChange={(e) => setNewDueAt(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Total Marks *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newTotalMarks}
                  onChange={(e) => setNewTotalMarks(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description / Prompt *</label>
                <textarea
                  required
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Provide assignment instructions..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Create Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

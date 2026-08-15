"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BackNavigation } from "@/components/ui/BackNavigation";
import type { LmsLesson } from "@apexium/types";

interface OptionItem {
  id: string;
  name: string;
}

export default function LmsLessonsPage() {
  const [lessons, setLessons] = useState<LmsLesson[]>([]);
  const [classes, setClasses] = useState<OptionItem[]>([]);
  const [subjects, setSubjects] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newSubjectId, setNewSubjectId] = useState<string>("");
  const [newClassId, setNewClassId] = useState<string>("");
  const [newTermId, setNewTermId] = useState<string>("");
  const [newTopic, setNewTopic] = useState<string>("");
  const [newContentBody, setNewContentBody] = useState<string>("");
  const [newMediaType, setNewMediaType] = useState<"none" | "youtube" | "vimeo" | "audio" | "direct_video">("none");
  const [newMediaUrl, setNewMediaUrl] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchInitialOptions = async () => {
    try {
      const res = await fetch("/api/timetable/options");
      const json = await res.json();
      if (json.success && json.data) {
        setClasses(json.data.classes || []);
        setSubjects(json.data.subjects || []);
        if (json.data.terms && json.data.terms.length > 0) {
          setNewTermId(json.data.terms[0].id);
        }
      }
    } catch (e) {
      console.error("Failed loading options", e);
    }
  };

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClass) params.set("classId", selectedClass);
      if (selectedSubject) params.set("subjectId", selectedSubject);

      const res = await fetch(`/api/lms/lessons?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLessons(json.data || []);
      }
    } catch (e) {
      console.error("Failed fetching lessons", e);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedSubject]);

  useEffect(() => {
    fetchInitialOptions();
  }, []);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newSubjectId || !newClassId || !newTermId || !newContentBody) {
      setMessage({ type: "error", text: "Please fill in all required fields." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/lms/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          subjectId: newSubjectId,
          classId: newClassId,
          termId: newTermId,
          topic: newTopic,
          contentBody: newContentBody,
          mediaType: newMediaType,
          mediaUrl: newMediaUrl,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Lesson note created successfully!" });
        setShowCreateModal(false);
        setNewTitle("");
        setNewTopic("");
        setNewContentBody("");
        setNewMediaUrl("");
        fetchLessons();
      } else {
        setMessage({ type: "error", text: json.error || "Failed to create lesson note." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error saving lesson note." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back to Dashboard Navigation */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Lesson Notes & Curriculum</h1>
          <p className="text-sm text-slate-400 mt-1">
            Access scheme-of-work topics, low-bandwidth text notes, and media embeds.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Lesson Note
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Filter Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Filter Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lessons Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Loading lessons...</div>
      ) : lessons.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <p className="text-slate-500 font-medium">No lesson notes found for the selected filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                {lesson.topic && (
                  <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-md mb-2">
                    {lesson.topic}
                  </span>
                )}
                <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{lesson.title}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                  {lesson.contentBody.replace(/[#*`_]/g, "")}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 capitalize">
                  {lesson.mediaType !== "none" ? `📺 ${lesson.mediaType}` : "📄 Text Note"}
                </span>
                <Link
                  href={`/dashboard/academics/lessons/${lesson.id}`}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  Read Note →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Lesson Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Create Lesson Note</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Introduction to Quadratic Equations"
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

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Scheme-of-Work Topic</label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="e.g. Algebra — Week 3"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lesson Content (Markdown / Text) *</label>
                <textarea
                  required
                  rows={6}
                  value={newContentBody}
                  onChange={(e) => setNewContentBody(e.target.value)}
                  placeholder="Write comprehensive lesson notes here..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Media Embed Type</label>
                  <select
                    value={newMediaType}
                    onChange={(e) => setNewMediaType(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                  >
                    <option value="none">None (Text Only)</option>
                    <option value="youtube">YouTube Embed Link</option>
                    <option value="vimeo">Vimeo Embed Link</option>
                    <option value="audio">Audio Embed Link</option>
                  </select>
                </div>

                {newMediaType !== "none" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Embed URL</label>
                    <input
                      type="url"
                      value={newMediaUrl}
                      onChange={(e) => setNewMediaUrl(e.target.value)}
                      placeholder="https://www.youtube.com/embed/..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                    />
                  </div>
                )}
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
                  {saving ? "Saving..." : "Save Lesson Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

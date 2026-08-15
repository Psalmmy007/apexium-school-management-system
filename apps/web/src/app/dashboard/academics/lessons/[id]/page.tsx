"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { BackNavigation } from "@/components/ui/BackNavigation";
import type { LmsLesson } from "@apexium/types";

export default function LessonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params?.id as string;

  const [lesson, setLesson] = useState<LmsLesson | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadMedia, setLoadMedia] = useState<boolean>(false); // Low-Bandwidth Mode default: FALSE (Text First)

  const fetchLesson = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lms/lessons?id=${lessonId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setLesson(json.data);
      }
    } catch (e) {
      console.error("Error loading lesson detail", e);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    if (lessonId) fetchLesson();
  }, [lessonId, fetchLesson]);

  if (loading) {
    return <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Loading lesson note...</div>;
  }

  if (!lesson) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
        <p className="text-slate-500 font-medium">Lesson note not found.</p>
        <button
          onClick={() => router.push("/dashboard/academics/lessons")}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-xl"
        >
          ← Return to Lessons
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <BackNavigation href="/dashboard/academics/lessons" label="Back to Lessons" />

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        {lesson.topic && (
          <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-lg">
            {lesson.topic}
          </span>
        )}
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{lesson.title}</h1>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-400 pt-2 border-t border-slate-100">
          <span>Created: {new Date(lesson.createdAt).toLocaleDateString()}</span>
          <span>Content Type: {lesson.contentType.toUpperCase()}</span>
        </div>
      </div>

      {/* Low-Bandwidth Media Player Section */}
      {lesson.mediaType !== "none" && lesson.mediaUrl && (
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold text-sm">⚡ Low-Bandwidth Mode</span>
              <span className="text-xs text-slate-400">(Media auto-load is disabled to save data)</span>
            </div>
            {!loadMedia && (
              <button
                onClick={() => setLoadMedia(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
              >
                ▶ Load Media Content
              </button>
            )}
          </div>

          {loadMedia ? (
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
              <iframe
                src={lesson.mediaUrl}
                title={lesson.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-800/60 rounded-xl border border-slate-700/50">
              <p className="text-sm font-semibold text-slate-300">
                Media embed ({lesson.mediaType}) available. Click &quot;Load Media Content&quot; above to stream.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lesson Body */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
          Lesson Notes
        </h2>
        <div className="prose prose-slate max-w-none text-slate-800 whitespace-pre-line leading-relaxed font-sans text-base">
          {lesson.contentBody}
        </div>
      </div>
    </div>
  );
}

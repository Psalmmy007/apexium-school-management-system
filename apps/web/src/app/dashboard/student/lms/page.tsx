"use client";

import { useEffect, useState } from "react";
import { BackNavigation } from "@/components/ui/BackNavigation";

interface Lesson {
  id: string;
  title: string;
  content: string;
  videoUrl?: string;
  createdAt: string;
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
}

export default function StudentLmsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLms() {
      try {
        const res = await fetch("/api/student/lms");
        const json = await res.json();
        if (json.success) {
          setLessons(json.data.lessons);
          setAssignments(json.data.assignments);
        }
      } catch (err) {
        console.error("Failed to load LMS data", err);
      } finally {
        setLoading(false);
      }
    }
    loadLms();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back to Student Dashboard Navigation */}
      <BackNavigation href="/dashboard/student" label="Back to Student Dashboard" />

      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white">Learning Portal (LMS)</h1>
        <p className="text-sm text-slate-400">Access scheme-of-work lesson notes, video embeds, and homework assignments</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading learning notes & assignments...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Published Lessons */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Enrolled Lesson Notes</h2>
            {lessons.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No published lesson notes available.</p>
            ) : (
              <div className="space-y-3">
                {lessons.map((les) => (
                  <div key={les.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <h3 className="font-semibold text-sm text-gray-900">{les.title}</h3>
                    <p className="text-xs text-gray-600 line-clamp-2">{les.content}</p>
                    <p className="text-[10px] text-gray-400">Published: {new Date(les.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignments */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Homework & Assignments</h2>
            {assignments.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No active assignments assigned to your class.</p>
            ) : (
              <div className="space-y-3">
                {assignments.map((asgn) => (
                  <div key={asgn.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <h3 className="font-semibold text-sm text-gray-900">{asgn.title}</h3>
                    {asgn.description && <p className="text-xs text-gray-600">{asgn.description}</p>}
                    {asgn.dueDate && <p className="text-[10px] text-amber-600 font-semibold">Due: {new Date(asgn.dueDate).toLocaleDateString()}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

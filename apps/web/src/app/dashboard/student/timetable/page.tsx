"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";

interface TimetableEntry {
  id: string;
  dayOfWeek: string;
  subjectId: string;
  periodId: string;
}

export default function StudentTimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTimetable() {
      try {
        const res = await fetch("/api/student/timetable");
        const json = await res.json();
        if (json.success) {
          setEntries(json.data);
        }
      } catch (err) {
        console.error("Failed to load timetable", err);
      } finally {
        setLoading(false);
      }
    }
    loadTimetable();
  }, []);

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];

  return (
    <DashboardShell user={{ firstName: "Student", lastName: "User", role: "student" }}>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Weekly Class Timetable</h1>
          <p className="text-sm text-gray-500">View your assigned weekly period schedule</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading weekly schedule...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 bg-gray-50 rounded-xl text-center border border-gray-200 text-gray-500">
            No timetable entries have been scheduled for your class yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {days.map((day) => {
              const dayEntries = entries.filter((e) => e.dayOfWeek.toLowerCase() === day);
              return (
                <div key={day} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                    {day}
                  </h3>
                  {dayEntries.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">No periods</p>
                  ) : (
                    <div className="space-y-2">
                      {dayEntries.map((e) => (
                        <div key={e.id} className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs">
                          <p className="font-semibold text-indigo-900">Subject Period</p>
                          <p className="text-[10px] text-indigo-600">Scheduled</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

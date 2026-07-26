"use client";

import { useEffect, useState } from "react";

interface TimetableEntry {
  id: string;
  schoolId: string;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  teacherId: string;
  periodId: string;
  dayOfWeek: "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
  roomNumber?: string | null;
  className: string;
  subjectName: string;
  subjectCode?: string | null;
  teacherFirstName: string;
  teacherLastName: string;
  periodName: string;
  periodStartTime: string;
  periodEndTime: string;
}

interface OptionItem {
  id: string;
  name?: string;
  code?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  startTime?: string;
  endTime?: string;
}

const DAYS: Array<"monday" | "tuesday" | "wednesday" | "thursday" | "friday"> = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

export default function TimetablePage() {
  const [classesList, setClassesList] = useState<OptionItem[]>([]);
  const [subjectsList, setSubjectsList] = useState<OptionItem[]>([]);
  const [periodsList, setPeriodsList] = useState<OptionItem[]>([]);
  const [teachersList, setTeachersList] = useState<OptionItem[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [slotDay, setSlotDay] = useState<"monday" | "tuesday" | "wednesday" | "thursday" | "friday">("monday");
  const [slotPeriodId, setSlotPeriodId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [roomNumber, setRoomNumber] = useState<string>("");

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchTimetable(selectedClassId);
    }
  }, [selectedClassId]);

  async function fetchOptions() {
    setLoading(true);
    try {
      const res = await fetch("/api/timetable/options");
      const json = await res.json();
      if (json.success) {
        const cls = json.data.classes || [];
        setClassesList(cls);
        setSubjectsList(json.data.subjects || []);
        setPeriodsList(json.data.periods || []);
        setTeachersList(json.data.teachers || []);

        if (cls.length > 0) {
          setSelectedClassId(cls[0].id);
        }
      }
    } catch (err: any) {
      setErrorMsg("Failed to load options");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTimetable(classId: string) {
    try {
      const res = await fetch(`/api/timetable?classId=${classId}`);
      const json = await res.json();
      if (json.success) {
        setTimetableEntries(json.data.items || []);
      } else {
        setTimetableEntries([]);
      }
    } catch (err: any) {
      setErrorMsg("Failed to load timetable entries");
    }
  }

  function openAddModal(day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday", periodId: string) {
    setSlotDay(day);
    setSlotPeriodId(periodId);
    setErrorMsg("");
    setSuccessMsg("");

    // Prepopulate if slot exists
    const existing = timetableEntries.find(
      (e) => e.dayOfWeek === day && e.periodId === periodId
    );
    if (existing) {
      setSelectedSubjectId(existing.subjectId);
      setSelectedTeacherId(existing.teacherId);
      setRoomNumber(existing.roomNumber || "");
    } else {
      setSelectedSubjectId(subjectsList[0]?.id || "");
      setSelectedTeacherId(teachersList[0]?.id || "");
      setRoomNumber("");
    }

    setIsModalOpen(true);
  }

  async function handleSaveSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClassId || !selectedSubjectId || !selectedTeacherId || !slotPeriodId) {
      setErrorMsg("Please select all required fields.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          teacherId: selectedTeacherId,
          periodId: slotPeriodId,
          dayOfWeek: slotDay,
          roomNumber: roomNumber || null,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error || "Failed to schedule slot");
      } else {
        setSuccessMsg("Timetable entry scheduled successfully!");
        setIsModalOpen(false);
        fetchTimetable(selectedClassId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error scheduling slot");
    } finally {
      setSaving(false);
    }
  }

  const selectedClass = classesList.find((c) => c.id === selectedClassId);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            Class Timetable & Schedule
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Build and manage weekly period schedules with conflict prevention.
          </p>
        </div>

        {/* Class Selector Dropdown */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <label htmlFor="class-selector" className="text-xs font-semibold text-slate-500 uppercase px-2">
            Select Class:
          </label>
          <select
            id="class-selector"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="input bg-slate-50 py-1.5 px-3 text-sm font-semibold text-indigo-700 border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {classesList.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 shadow-xs">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold">Scheduling Error</p>
            <p className="mt-0.5 text-red-600">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-3 shadow-xs">
          <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {/* ── Timetable Grid Matrix ──────────────────────────────── */}
      {loading ? (
        <div className="card p-12 text-center text-slate-400 animate-pulse">
          Loading timetable schedules...
        </div>
      ) : (
        <div className="table-container shadow-md border-slate-200 bg-white">
          <table className="table w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300 w-36 border-r border-slate-800">
                  Period / Time
                </th>
                {DAYS.map((day) => (
                  <th key={day} className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-center border-r border-slate-800 last:border-0">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periodsList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No periods configured. Configure period slots in settings.
                  </td>
                </tr>
              ) : (
                periodsList.map((period) => (
                  <tr key={period.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    {/* Period Info Column */}
                    <td className="px-4 py-3 border-r border-slate-200 bg-slate-50 font-medium">
                      <div className="text-sm font-bold text-slate-800">{period.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {period.startTime} - {period.endTime}
                      </div>
                    </td>

                    {/* Day Columns */}
                    {DAYS.map((day) => {
                      const entry = timetableEntries.find(
                        (e) => e.dayOfWeek === day && e.periodId === period.id
                      );

                      return (
                        <td
                          key={day}
                          onClick={() => openAddModal(day, period.id)}
                          className="px-3 py-3 border-r border-slate-200 last:border-0 text-center align-top cursor-pointer hover:bg-indigo-50/40 transition-colors group relative"
                        >
                          {entry ? (
                            <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-200 text-left shadow-xs group-hover:border-indigo-400 transition-all">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-indigo-900 truncate">
                                  {entry.subjectName}
                                </span>
                                {entry.subjectCode && (
                                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                                    {entry.subjectCode}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 font-medium mt-1 truncate">
                                👨‍🏫 {entry.teacherFirstName} {entry.teacherLastName}
                              </div>
                              {entry.roomNumber && (
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  📍 Room {entry.roomNumber}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-16 flex flex-col items-center justify-center text-slate-300 group-hover:text-indigo-500 transition-colors">
                              <svg className="w-5 h-5 opacity-40 group-hover:opacity-100 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              <span className="text-[11px] font-medium opacity-0 group-hover:opacity-100">Assign</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Assign / Edit Period Modal ───────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Assign Timetable Period</h3>
                <p className="text-xs text-slate-400 capitalize">
                  {slotDay} · {periodsList.find((p) => p.id === slotPeriodId)?.name} ({selectedClass?.name})
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="p-6 space-y-4">
              {/* Subject */}
              <div>
                <label className="label">Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="input cursor-pointer"
                  required
                >
                  <option value="">Select Subject...</option>
                  {subjectsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || "NO-CODE"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Teacher */}
              <div>
                <label className="label">Assigned Teacher</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="input cursor-pointer"
                  required
                >
                  <option value="">Select Teacher...</option>
                  {teachersList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Number */}
              <div>
                <label className="label">Room / Lab Number (Optional)</label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. Lab 2, Room 104"
                  className="input"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? "Checking Conflicts..." : "Save Schedule Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

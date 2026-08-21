"use client";

import { useEffect, useState, useRef } from "react";
import { BackNavigation } from "@/components/ui/BackNavigation";

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
  periodSortOrder?: number;
}

interface PeriodItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
}

interface OptionItem {
  id: string;
  name?: string;
  code?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

const DAYS: Array<"monday" | "tuesday" | "wednesday" | "thursday" | "friday"> = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

export default function TimetablePage() {
  const [activeTab, setActiveTab] = useState<"grid" | "periods">("grid");

  // Options & Data
  const [classesList, setClassesList] = useState<OptionItem[]>([]);
  const [subjectsList, setSubjectsList] = useState<OptionItem[]>([]);
  const [periodsList, setPeriodsList] = useState<PeriodItem[]>([]);
  const [teachersList, setTeachersList] = useState<OptionItem[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Slot Assignment Modal
  const [isSlotModalOpen, setIsSlotModalOpen] = useState<boolean>(false);
  const [slotDay, setSlotDay] = useState<"monday" | "tuesday" | "wednesday" | "thursday" | "friday">("monday");
  const [slotPeriodId, setSlotPeriodId] = useState<string>("");
  const [existingEntryId, setExistingEntryId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [roomNumber, setRoomNumber] = useState<string>("");
  const [isDoublePeriod, setIsDoublePeriod] = useState<boolean>(false);

  // Period Create / Edit Modal
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState<boolean>(false);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [periodName, setPeriodName] = useState<string>("");
  const [periodStartTime, setPeriodStartTime] = useState<string>("");
  const [periodEndTime, setPeriodEndTime] = useState<string>("");
  const [periodSortOrder, setPeriodSortOrder] = useState<number>(1);
  const [periodSaving, setPeriodSaving] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  async function fetchOptions() {
    setLoading(true);
    try {
      const res = await fetch("/api/timetable/options");
      const json = await res.json();
      if (json.success && json.data.classes?.length > 0) {
        const cls = json.data.classes || [];
        setClassesList(cls);
        setSubjectsList(json.data.subjects || []);
        setPeriodsList(json.data.periods || []);
        setTeachersList(json.data.teachers || []);
        if (!selectedClassId) {
          setSelectedClassId(cls[0].id);
        }
      } else {
        setClassesList([]);
        setPeriodsList(json.data?.periods || []);
        setSubjectsList(json.data?.subjects || []);
        setTeachersList(json.data?.teachers || []);
      }
    } catch (err) {
      console.warn("Failed to fetch timetable options:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPeriods() {
    try {
      const res = await fetch("/api/timetable/periods");
      const json = await res.json();
      if (json.success) {
        setPeriodsList(json.data || []);
      }
    } catch (err) {
      console.warn("Failed fetching periods:", err);
    }
  }

  async function fetchTimetable(classId: string) {
    if (!classId) {
      setTimetableEntries([]);
      return;
    }
    try {
      const res = await fetch(`/api/timetable?classId=${classId}`);
      const json = await res.json();
      if (json.success && json.data.items) {
        setTimetableEntries(json.data.items);
      } else {
        setTimetableEntries([]);
      }
    } catch (err) {
      console.warn("Failed loading timetable:", err);
      setTimetableEntries([]);
    }
  }

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchTimetable(selectedClassId);
    } else {
      setTimetableEntries([]);
    }
  }, [selectedClassId]);

  // ── Slot Modal Handlers ─────────────────────────────────────
  function openAddModal(day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday", periodId: string) {
    setSlotDay(day);
    setSlotPeriodId(periodId);
    setErrorMsg("");
    setSuccessMsg("");
    setIsDoublePeriod(false);

    const existing = timetableEntries.find(
      (e) => e.dayOfWeek === day && e.periodId === periodId
    );
    if (existing) {
      setExistingEntryId(existing.id);
      setSelectedSubjectId(existing.subjectId);
      setSelectedTeacherId(existing.teacherId);
      setRoomNumber(existing.roomNumber || "");
    } else {
      setExistingEntryId(null);
      setSelectedSubjectId(subjectsList[0]?.id || "");
      setSelectedTeacherId(teachersList[0]?.id || "");
      setRoomNumber("");
    }

    setIsSlotModalOpen(true);
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
          isDoublePeriod,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error || "Failed to schedule slot");
      } else {
        setSuccessMsg(
          isDoublePeriod
            ? "Double period scheduled successfully across 2 consecutive slots!"
            : "Timetable entry scheduled successfully!"
        );
        setIsSlotModalOpen(false);
        fetchTimetable(selectedClassId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error scheduling slot");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearSlot(entryId: string) {
    if (!confirm("Are you sure you want to clear this scheduled lesson slot?")) return;

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/timetable?id=${entryId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg("Timetable slot cleared successfully.");
        setIsSlotModalOpen(false);
        fetchTimetable(selectedClassId);
      } else {
        setErrorMsg(json.error || "Failed to clear slot.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to clear slot.");
    } finally {
      setSaving(false);
    }
  }

  // ── Period Manager Handlers ──────────────────────────────────
  function openNewPeriodModal() {
    setEditingPeriodId(null);
    setPeriodName("");
    setPeriodStartTime("08:00");
    setPeriodEndTime("08:45");
    setPeriodSortOrder(periodsList.length + 1);
    setIsPeriodModalOpen(true);
  }

  function openEditPeriodModal(period: PeriodItem) {
    setEditingPeriodId(period.id);
    setPeriodName(period.name);
    setPeriodStartTime(period.startTime);
    setPeriodEndTime(period.endTime);
    setPeriodSortOrder(period.sortOrder);
    setIsPeriodModalOpen(true);
  }

  async function handleSavePeriod(e: React.FormEvent) {
    e.preventDefault();
    if (!periodName || !periodStartTime || !periodEndTime) {
      setErrorMsg("Please fill in all period fields.");
      return;
    }

    setPeriodSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (editingPeriodId) {
        const res = await fetch("/api/timetable/periods", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            periodId: editingPeriodId,
            name: periodName,
            startTime: periodStartTime,
            endTime: periodEndTime,
            sortOrder: periodSortOrder,
          }),
        });
        const json = await res.json();
        if (!json.success) {
          setErrorMsg(json.error || "Failed to update period");
        } else {
          setSuccessMsg("Period updated successfully.");
          setIsPeriodModalOpen(false);
          fetchPeriods();
        }
      } else {
        const res = await fetch("/api/timetable/periods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: periodName,
            startTime: periodStartTime,
            endTime: periodEndTime,
            sortOrder: periodSortOrder,
          }),
        });
        const json = await res.json();
        if (!json.success) {
          setErrorMsg(json.error || "Failed to create period");
        } else {
          setSuccessMsg("Period created successfully.");
          setIsPeriodModalOpen(false);
          fetchPeriods();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed saving period.");
    } finally {
      setPeriodSaving(false);
    }
  }

  async function handleDeletePeriod(periodId: string, name: string) {
    if (!confirm(`Delete period "${name}"? This will also remove any lessons scheduled during this period.`)) {
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/timetable/periods?id=${periodId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Period "${name}" deleted.`);
        fetchPeriods();
        if (selectedClassId) fetchTimetable(selectedClassId);
      } else {
        setErrorMsg(json.error || "Failed to delete period.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed deleting period.");
    }
  }

  async function handleSeedStandard8Periods(overwrite = false) {
    if (overwrite && !confirm("This will replace all existing periods with the Standard 8-Period schedule. Continue?")) {
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/timetable/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_standard_8", overwrite }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg("Standard 8-Period Day schedule (8:00 AM – 3:45 PM) initialized successfully!");
        await fetchPeriods();
        if (selectedClassId) fetchTimetable(selectedClassId);
      } else {
        setErrorMsg(json.error || "Failed to initialize 8-period schedule.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error loading preset.");
    } finally {
      setLoading(false);
    }
  }

  const selectedClass = classesList.find((c) => c.id === selectedClassId);

  // Helper to check if a period is non-academic break
  function isBreakPeriod(name: string) {
    const lower = name.toLowerCase();
    return lower.includes("break") || lower.includes("recess") || lower.includes("lunch") || lower.includes("assembly");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Navigation */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      {/* Header Bar with Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            Class Timetable & Period Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure flexible bell timings, 8-period daily structures, and allocate weekly master class schedules.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("grid")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === "grid"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📅 Master Timetable
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("periods")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === "periods"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ⏱️ Bell & Period Settings ({periodsList.length})
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3 shadow-xs">
          <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold">Conflict / Notice</p>
            <p className="mt-0.5 text-red-300 text-xs">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3 shadow-xs">
          <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="font-medium text-xs">{successMsg}</p>
        </div>
      )}

      {/* ── TAB 1: MASTER TIMETABLE GRID ───────────────────────────────────── */}
      {activeTab === "grid" && (
        <div className="space-y-4">
          {/* Class Controls & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <label htmlFor="class-selector" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Select Class:
              </label>
              {classesList.length > 0 ? (
                <select
                  id="class-selector"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-slate-800 py-2 px-3.5 text-sm font-bold text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {classesList.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-amber-400">No classes registered yet</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-secondary btn-sm text-xs flex items-center gap-1.5"
                title="Print Timetable View"
              >
                🖨️ Print Matrix
              </button>
              {periodsList.length === 0 && (
                <button
                  type="button"
                  onClick={() => handleSeedStandard8Periods(false)}
                  className="btn-primary btn-sm text-xs flex items-center gap-1.5"
                >
                  ⚡ Setup 8-Period Day
                </button>
              )}
            </div>
          </div>

          {/* Grid Render */}
          {loading ? (
            <div className="p-16 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse">
              Loading class timetable matrix...
            </div>
          ) : classesList.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto text-xl font-bold">
                🏫
              </div>
              <p className="text-base font-bold text-white">No Classes Registered Yet</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Configure your school classes (e.g. JSS 1, SS 2) before assigning timetable periods.
              </p>
              <div className="pt-2">
                <a
                  href="/dashboard/setup"
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
                >
                  Go to School Setup Wizard →
                </a>
              </div>
            </div>
          ) : periodsList.length === 0 ? (
            <div className="p-12 text-center space-y-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-xl font-bold">
                ⏱️
              </div>
              <p className="text-base font-bold text-white">No Bell Periods Configured</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Set up your daily period timings first. You can load the standard Nigerian 8-period school day in 1 click or create custom timings.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSeedStandard8Periods(false)}
                  className="btn-primary text-xs"
                >
                  ⚡ Load Standard 8-Period Day (8:00 AM – 3:45 PM)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("periods")}
                  className="btn-secondary text-xs"
                >
                  Configure Custom Periods →
                </button>
              </div>
            </div>
          ) : (
            <div ref={printRef} className="overflow-x-auto rounded-2xl border border-slate-800 shadow-xl bg-slate-900">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-950/80 text-white border-b border-slate-800">
                    <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-400 w-44 border-r border-slate-800">
                      Period / Time
                    </th>
                    {DAYS.map((day) => (
                      <th
                        key={day}
                        className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-center border-r border-slate-800 last:border-0 capitalize text-slate-200"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium text-xs">
                  {periodsList.map((period) => {
                    const isBreak = isBreakPeriod(period.name);

                    return (
                      <tr
                        key={period.id}
                        className={`transition ${
                          isBreak ? "bg-slate-950/40" : "hover:bg-slate-800/30"
                        }`}
                      >
                        {/* Period Info Column */}
                        <td className="px-4 py-3.5 border-r border-slate-800 bg-slate-950/30 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{period.name}</span>
                            {isBreak && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Break
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {period.startTime} – {period.endTime}
                          </div>
                        </td>

                        {/* Day Columns */}
                        {DAYS.map((day) => {
                          if (isBreak) {
                            return (
                              <td
                                key={day}
                                className="px-3 py-3 border-r border-slate-800 last:border-0 text-center text-slate-500 text-[11px] font-semibold tracking-wide bg-slate-950/20"
                              >
                                — {period.name} —
                              </td>
                            );
                          }

                          const entry = timetableEntries.find(
                            (e) => e.dayOfWeek === day && e.periodId === period.id
                          );

                          return (
                            <td
                              key={day}
                              onClick={() => openAddModal(day, period.id)}
                              className="px-2.5 py-2.5 border-r border-slate-800 last:border-0 text-center align-top cursor-pointer hover:bg-indigo-600/10 transition-colors group relative"
                            >
                              {entry ? (
                                <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-left shadow-xs group-hover:border-indigo-400 transition-all space-y-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-white truncate text-xs">
                                      {entry.subjectName}
                                    </span>
                                    {entry.subjectCode && (
                                      <span className="text-[9px] font-bold text-indigo-300 bg-indigo-900/60 border border-indigo-500/40 px-1 py-0.5 rounded">
                                        {entry.subjectCode}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-300 truncate">
                                    👨‍🏫 {entry.teacherFirstName} {entry.teacherLastName}
                                  </div>
                                  {entry.roomNumber && (
                                    <div className="text-[10px] text-slate-400">
                                      📍 {entry.roomNumber}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="h-16 flex flex-col items-center justify-center text-slate-600 group-hover:text-indigo-400 transition-colors">
                                  <span className="text-lg opacity-40 group-hover:opacity-100 mb-0.5">+</span>
                                  <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 uppercase tracking-wider">
                                    Assign
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: PERIOD & BELL SCHEDULE MANAGER ──────────────────────────── */}
      {activeTab === "periods" && (
        <div className="space-y-5">
          {/* Summary & Preset Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div>
              <h3 className="text-base font-bold text-white">Daily Bell & Period Structure</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Define the sequence, start/end times, and duration for your school&apos;s periods.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleSeedStandard8Periods(periodsList.length > 0)}
                className="btn-secondary btn-sm text-xs flex items-center gap-1.5"
              >
                ⚡ {periodsList.length > 0 ? "Reset to Standard 8-Period Day" : "Load Standard 8-Period Day"}
              </button>
              <button
                type="button"
                onClick={openNewPeriodModal}
                className="btn-primary btn-sm text-xs flex items-center gap-1.5"
              >
                + Add Custom Period
              </button>
            </div>
          </div>

          {/* Period Table */}
          {periodsList.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-base font-bold text-white">No Periods Configured</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click &quot;Load Standard 8-Period Day&quot; to initialize assembly, 8 teaching periods, and recess/lunch breaks automatically.
              </p>
              <button
                type="button"
                onClick={() => handleSeedStandard8Periods(false)}
                className="btn-primary text-xs"
              >
                ⚡ Initialize 8-Period Schedule
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-4 w-16">Order</th>
                    <th className="py-3 px-4">Period Name</th>
                    <th className="py-3 px-4">Start Time</th>
                    <th className="py-3 px-4">End Time</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {periodsList.map((p) => {
                    const isBreak = isBreakPeriod(p.name);

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                          #{p.sortOrder}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          {p.name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {p.startTime}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {p.endTime}
                        </td>
                        <td className="py-3.5 px-4">
                          {isBreak ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              Non-Academic Break
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                              Teaching Period
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditPeriodModal(p)}
                              className="btn-ghost btn-xs text-indigo-400 hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePeriod(p.id, p.name)}
                              className="btn-ghost btn-xs text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ASSIGN / EDIT PERIOD MODAL ───────────────────────── */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden text-white">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base">Assign Timetable Period</h3>
                <p className="text-xs text-slate-400 capitalize">
                  {slotDay} · {periodsList.find((p) => p.id === slotPeriodId)?.name} ({selectedClass?.name})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSlotModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="p-6 space-y-4 text-xs">
              {/* Subject */}
              <div>
                <label className="label text-slate-300 font-semibold mb-1 block">Subject *</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="input bg-slate-800 border-slate-700 text-white w-full rounded-xl py-2.5 px-3"
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
                <label className="label text-slate-300 font-semibold mb-1 block">Assigned Teacher *</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="input bg-slate-800 border-slate-700 text-white w-full rounded-xl py-2.5 px-3"
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
                <label className="label text-slate-300 font-semibold mb-1 block">Room / Lab Number (Optional)</label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. Science Lab 1, Room 204"
                  className="input bg-slate-800 border-slate-700 text-white w-full rounded-xl py-2.5 px-3"
                />
              </div>

              {/* Double Period Toggle */}
              {!existingEntryId && (
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDoublePeriod}
                      onChange={(e) => setIsDoublePeriod(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-bold text-white text-xs">⚡ Double Period (Consecutive 2-Slot Allocation)</span>
                  </label>
                  <p className="text-[11px] text-slate-400 pl-6">
                    Automatically schedules this subject across both this period and the next consecutive period. Teacher availability will be validated for both.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                {existingEntryId ? (
                  <button
                    type="button"
                    onClick={() => handleClearSlot(existingEntryId)}
                    disabled={saving}
                    className="btn-danger btn-sm text-xs"
                  >
                    Clear Slot
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSlotModalOpen(false)}
                    className="btn-ghost btn-sm text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary btn-sm text-xs font-bold"
                  >
                    {saving ? "Checking Conflicts..." : "Save Lesson Slot"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT PERIOD MODAL ───────────────────────── */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden text-white">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base">
                  {editingPeriodId ? "Edit Period Slot" : "Add Custom Period"}
                </h3>
                <p className="text-xs text-slate-400">
                  Set the name, start time, and end time for this daily period.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPeriodModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePeriod} className="p-6 space-y-4 text-xs">
              <div>
                <label className="label text-slate-300 font-semibold mb-1 block">Period Name *</label>
                <input
                  type="text"
                  value={periodName}
                  onChange={(e) => setPeriodName(e.target.value)}
                  placeholder="e.g. Period 1, Short Break, Lunch"
                  className="input bg-slate-800 border-slate-700 text-white w-full rounded-xl py-2.5 px-3"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-slate-300 font-semibold mb-1 block">Start Time (HH:MM) *</label>
                  <input
                    type="text"
                    value={periodStartTime}
                    onChange={(e) => setPeriodStartTime(e.target.value)}
                    placeholder="08:30"
                    className="input bg-slate-800 border-slate-700 text-white w-full rounded-xl py-2.5 px-3 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="label text-slate-300 font-semibold mb-1 block">End Time (HH:MM) *</label>
                  <input
                    type="text"
                    value={periodEndTime}
                    onChange={(e) => setPeriodEndTime(e.target.value)}
                    placeholder="09:15"
                    className="input bg-slate-800 border-slate-700 text-white w-full rounded-xl py-2.5 px-3 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label text-slate-300 font-semibold mb-1 block">Sequence Order</label>
                <input
                  type="number"
                  value={periodSortOrder}
                  onChange={(e) => setPeriodSortOrder(Number(e.target.value))}
                  min={1}
                  className="input bg-slate-800 border-slate-700 text-white w-full rounded-xl py-2.5 px-3 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="btn-ghost btn-sm text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={periodSaving}
                  className="btn-primary btn-sm text-xs font-bold"
                >
                  {periodSaving ? "Saving..." : editingPeriodId ? "Update Period" : "Create Period"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

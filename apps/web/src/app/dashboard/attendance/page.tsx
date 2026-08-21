"use client";

import { useState, useEffect } from "react";
import { BackNavigation } from "@/components/ui/BackNavigation";
import { getRxDB, type RxAttendanceDoc } from "@/lib/rxdb/database";
import { Users, CheckCircle, Calendar, Plus, AlertCircle, BarChart3, Clock, Check, X, ShieldAlert } from "lucide-react";

interface ClassItem {
  id: string;
  name: string;
  code?: string;
  capacity?: number;
  studentCount?: number;
}

interface SectionItem {
  id: string;
  classId: string;
  name: string;
}

interface StudentItem {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  classId?: string;
  sectionId?: string;
}

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface AttendanceSummaryData {
  totalEnrolled: number;
  today: {
    date: string;
    totalMarked: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    rate: number;
  };
  classSummaries: Array<{
    id: string;
    name: string;
    totalStudents: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
    excusedToday: number;
    markedToday: number;
    rate: number;
  }>;
  past7Days: Array<{
    date: string;
    dayName: string;
    present: number;
    absent: number;
    rate: number;
  }>;
}

export default function MarkAttendancePage() {
  const [activeTab, setActiveTab] = useState<"kpi" | "register">("kpi");
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // KPI Data
  const [summaryData, setSummaryData] = useState<AttendanceSummaryData | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  // Register Data
  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [sectionList, setSectionList] = useState<SectionItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [totalSchoolStudents, setTotalSchoolStudents] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [studentList, setStudentList] = useState<StudentItem[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: AttendanceStatus; remarks: string }>
  >({});

  const [isOnline, setIsOnline] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Monitor network online/offline status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch initial summary & classes
  useEffect(() => {
    async function loadInitialData() {
      setInitialLoading(true);
      try {
        const [classesRes, summaryRes] = await Promise.allSettled([
          fetch("/api/classes").then((r) => r.json()),
          fetch("/api/attendance/summary").then((r) => r.json()),
        ]);

        if (classesRes.status === "fulfilled" && classesRes.value.success) {
          const classes = (classesRes.value.data.classes || []) as ClassItem[];
          setClassList(classes);
          setSectionList(classesRes.value.data.sections || []);
          setTotalSchoolStudents(classesRes.value.data.totalSchoolStudents ?? 0);

          const firstWithStudents = classes.find((c) => (c.studentCount || 0) > 0) || classes[0];
          if (firstWithStudents) {
            setSelectedClassId(firstWithStudents.id);
          }
        }

        if (summaryRes.status === "fulfilled" && summaryRes.value.success) {
          setSummaryData(summaryRes.value.data);
        }
      } catch (err) {
        console.warn("Failed loading attendance initial data", err);
      } finally {
        setInitialLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Refresh summary data
  async function refreshSummary() {
    setLoadingSummary(true);
    try {
      const res = await fetch("/api/attendance/summary");
      const json = await res.json();
      if (json.success) {
        setSummaryData(json.data);
      }
    } catch (err) {
      console.warn("Failed refreshing summary", err);
    } finally {
      setLoadingSummary(false);
    }
  }

  // Fetch students for selected class
  useEffect(() => {
    async function loadStudents() {
      if (!selectedClassId) {
        setStudentList([]);
        return;
      }
      setLoadingStudents(true);
      try {
        let url = `/api/students?classId=${selectedClassId}`;
        if (selectedSectionId) {
          url += `&sectionId=${selectedSectionId}`;
        }
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && json.data.students) {
          const students = json.data.students as StudentItem[];
          setStudentList(students);

          // Default all students to 'present' initially
          const initialMap: Record<
            string,
            { status: AttendanceStatus; remarks: string }
          > = {};
          students.forEach((s) => {
            initialMap[s.id] = { status: "present", remarks: "" };
          });

          // Check if existing attendance docs exist in RxDB for this date/class
          try {
            const rxdb = await getRxDB();
            const docs = await rxdb.attendance
              .find({
                selector: {
                  date: selectedDate,
                  classId: selectedClassId,
                },
              })
              .exec();

            docs.forEach((doc) => {
              const data = doc.toJSON() as RxAttendanceDoc;
              initialMap[data.studentId] = {
                status: data.status,
                remarks: data.remarks || "",
              };
            });
          } catch (e) {
            console.warn("RxDB offline read skipped or unavailable", e);
          }

          setAttendanceMap(initialMap);
        } else {
          setStudentList([]);
        }
      } catch (err) {
        console.warn("Failed loading student roster", err);
        setStudentList([]);
      } finally {
        setLoadingStudents(false);
      }
    }

    if (activeTab === "register") {
      loadStudents();
    }
  }, [selectedClassId, selectedSectionId, selectedDate, activeTab]);

  const availableSections = sectionList.filter(
    (s) => s.classId === selectedClassId
  );

  function setStatus(studentId: string, status: AttendanceStatus) {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  }

  function setRemarks(studentId: string, remarks: string) {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  }

  function markAll(status: AttendanceStatus) {
    setAttendanceMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], status };
      });
      return updated;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSyncStatus(null);
    try {
      const rxdb = await getRxDB();
      const recordsToSave: RxAttendanceDoc[] = studentList.map((s) => {
        const att = attendanceMap[s.id] || {
          status: "present",
          remarks: "",
        };
        return {
          id: `${s.id}_${selectedDate}_daily`,
          schoolId: "default-school",
          studentId: s.id,
          classId: selectedClassId,
          sectionId: selectedSectionId || undefined,
          date: selectedDate,
          period: "daily",
          status: att.status,
          remarks: att.remarks,
          synced: false,
          updatedAt: Date.now(),
        };
      });

      // 1. Bulk Upsert into RxDB (IndexedDB local offline storage)
      for (const record of recordsToSave) {
        await rxdb.attendance.upsert(record);
      }

      // 2. If online, immediately sync to server backend
      if (navigator.onLine) {
        const syncRes = await fetch("/api/attendance/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: recordsToSave }),
        });

        const syncJson = await syncRes.json();
        if (syncJson.success) {
          setSyncStatus(`Synced ${syncJson.data.syncedCount} records to server successfully!`);
          refreshSummary();
        } else {
          setSyncStatus("Saved locally (server sync pending)");
        }
      } else {
        setSyncStatus("Saved locally (Offline mode active)");
      }
    } catch (err: any) {
      console.error("Attendance save error", err);
      setSyncStatus("Saved locally (IndexedDB active)");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back to Dashboard Navigation */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </span>
            Attendance Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            School-wide daily attendance metrics, weekly institutional trends, and offline-first class registers.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("kpi")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
              activeTab === "kpi"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Attendance Intelligence (KPIs)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
              activeTab === "register"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            Class Roll Call Register
          </button>
        </div>
      </div>

      {/* ── SMOOTH INITIAL LOADING SKELETON (PREVENTS SETUP WIZARD FLASH) ──── */}
      {initialLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse space-y-3">
                <div className="h-4 bg-slate-800 rounded w-1/2" />
                <div className="h-8 bg-slate-800 rounded w-3/4" />
              </div>
            ))}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 animate-pulse">
            <p className="text-sm font-medium">Loading attendance records and class rosters...</p>
          </div>
        </div>
      ) : classList.length === 0 ? (
        <div className="card p-8 text-center space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto text-xl font-bold">
            🏫
          </div>
          <p className="text-base font-bold text-white">No Classes Registered Yet</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Configure your school classes (e.g. JSS 1, SSS 2) to begin tracking attendance.
          </p>
          <div className="pt-2">
            <a
              href="/dashboard/setup"
              id="btn-go-to-setup"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-sm"
            >
              Go to School Setup Wizard →
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* ── TAB 1: ATTENDANCE INTELLIGENCE & KPIS ───────────────────────── */}
          {activeTab === "kpi" && (
            <div className="space-y-6">
              {/* Top Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>Total Students</span>
                    <Users className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white">
                    {summaryData?.totalEnrolled ?? totalSchoolStudents ?? 0}
                  </div>
                  <p className="text-[11px] text-slate-400">Active enrolled students across all classes</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>Present Today</span>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-400">
                    {summaryData?.today.present ?? 0}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {summaryData?.today.late ? `+ ${summaryData.today.late} arrived late` : "Marked present today"}
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>Absent Today</span>
                    <X className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-rose-400">
                    {summaryData?.today.absent ?? 0}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {summaryData?.today.excused ? `${summaryData.today.excused} excused absences` : "Unexcused absences today"}
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>Today&apos;s Rate</span>
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white">
                    {summaryData?.today.rate ?? 0}%
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all"
                      style={{ width: `${summaryData?.today.rate ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Class-by-Class Attendance Summary */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white">Today&apos;s Class-by-Class Attendance</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Live attendance metrics reported by form teachers across each classroom.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={refreshSummary}
                    disabled={loadingSummary}
                    className="btn-secondary btn-sm text-xs"
                  >
                    {loadingSummary ? "Refreshing..." : "🔄 Refresh Metrics"}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Total Enrolled</th>
                        <th className="py-3 px-4">Present</th>
                        <th className="py-3 px-4">Absent</th>
                        <th className="py-3 px-4">Attendance Rate</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-medium">
                      {summaryData?.classSummaries.map((cls) => (
                        <tr key={cls.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-bold text-white">
                            {cls.name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {cls.totalStudents} students
                          </td>
                          <td className="py-3.5 px-4 text-emerald-400 font-semibold">
                            {cls.presentToday} present
                          </td>
                          <td className="py-3.5 px-4 text-rose-400 font-semibold">
                            {cls.absentToday} absent
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-white">{cls.rate}%</span>
                              <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    cls.rate >= 90
                                      ? "bg-emerald-500"
                                      : cls.rate >= 75
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                  }`}
                                  style={{ width: `${cls.rate}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClassId(cls.id);
                                setActiveTab("register");
                              }}
                              className="btn-ghost btn-xs text-indigo-400 hover:text-white"
                            >
                              Open Roll Call →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: CLASS ROLL CALL REGISTER ─────────────────────────────── */}
          {activeTab === "register" && (
            <div className="space-y-5">
              {/* Filter & Controls Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm">
                <div>
                  <label htmlFor="select-class" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Select Class *
                  </label>
                  <select
                    id="select-class"
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setSelectedSectionId("");
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                  >
                    {classList.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.studentCount ?? 0} {cls.studentCount === 1 ? "student" : "students"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Section / Arm
                  </label>
                  <select
                    id="select-section"
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                  >
                    <option value="">All Sections</option>
                    {availableSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Roll Call Date *
                  </label>
                  <input
                    id="attendance-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition font-mono"
                  />
                </div>
              </div>

              {/* Network / Sync Status Alert */}
              <div className="flex items-center justify-between gap-3">
                <div
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
                    isOnline
                      ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                      : "bg-amber-950/60 text-amber-300 border border-amber-800/60"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  {isOnline ? "Online — Instant Server Sync" : "Offline Mode — Caching to IndexedDB"}
                </div>

                {syncStatus && (
                  <p className="text-xs text-indigo-400 font-semibold">{syncStatus}</p>
                )}
              </div>

              {/* Student Roll Call Table */}
              {loadingStudents ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                  <p className="text-sm font-medium text-slate-400 animate-pulse">Loading class student roster...</p>
                </div>
              ) : studentList.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto text-xl font-bold">
                    👥
                  </div>
                  <p className="text-base font-bold text-white">No Students in this Class</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    There are no enrolled students assigned to this class yet. Add students from the Students Directory.
                  </p>
                  <div className="pt-2">
                    <a
                      href="/dashboard/students/new"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
                    >
                      <Plus className="w-4 h-4" />
                      Add Student
                    </a>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
                  {/* Quick Mark All Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Roster: {studentList.length} Students
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => markAll("present")}
                        className="btn-ghost btn-xs text-emerald-400 hover:bg-emerald-950/40"
                      >
                        ✓ Mark All Present
                      </button>
                      <button
                        type="button"
                        onClick={() => markAll("absent")}
                        className="btn-ghost btn-xs text-rose-400 hover:bg-rose-950/40"
                      >
                        ✕ Mark All Absent
                      </button>
                    </div>
                  </div>

                  {/* Student Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Admission No</th>
                          <th className="py-3 px-4">Attendance Status</th>
                          <th className="py-3 px-4">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-medium">
                        {studentList.map((student) => {
                          const currentStatus = attendanceMap[student.id]?.status || "present";
                          const currentRemarks = attendanceMap[student.id]?.remarks || "";

                          return (
                            <tr key={student.id} className="hover:bg-slate-800/40 transition">
                              <td className="py-3.5 px-4 font-bold text-white">
                                {student.lastName}, {student.firstName} {student.middleName || ""}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-slate-300">
                                {student.admissionNumber}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  {(["present", "absent", "late", "excused"] as AttendanceStatus[]).map((status) => (
                                    <button
                                      key={status}
                                      type="button"
                                      onClick={() => setStatus(student.id, status)}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition ${
                                        currentStatus === status
                                          ? status === "present"
                                            ? "bg-emerald-600 text-white shadow-xs"
                                            : status === "absent"
                                            ? "bg-rose-600 text-white shadow-xs"
                                            : status === "late"
                                            ? "bg-amber-600 text-white shadow-xs"
                                            : "bg-indigo-600 text-white shadow-xs"
                                          : "bg-slate-800 text-slate-400 hover:text-white"
                                      }`}
                                    >
                                      {status}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <input
                                  type="text"
                                  placeholder="e.g. Doctor's note, late arrival"
                                  value={currentRemarks}
                                  onChange={(e) => setRemarks(student.id, e.target.value)}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-slate-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Save Footer */}
                  <div className="flex items-center justify-end pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-primary btn-sm font-bold text-xs flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {saving ? "Saving Records..." : "Save & Sync Attendance"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

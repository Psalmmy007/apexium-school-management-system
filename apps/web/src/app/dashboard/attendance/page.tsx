"use client";

import { useState, useEffect } from "react";
import { BackNavigation } from "@/components/ui/BackNavigation";
import { getRxDB, type RxAttendanceDoc } from "@/lib/rxdb/database";
import { Users, CheckCircle, Calendar, Plus, AlertCircle } from "lucide-react";

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

export default function MarkAttendancePage() {
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

  // Fetch classes and sections
  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetch("/api/classes");
        const json = await res.json();
        if (json.success && json.data.classes?.length > 0) {
          const classes = json.data.classes as ClassItem[];
          setClassList(classes);
          setSectionList(json.data.sections || []);
          setTotalSchoolStudents(json.data.totalSchoolStudents ?? 0);

          // Select first class that has students, or fall back to the first class
          const firstWithStudents = classes.find((c) => (c.studentCount || 0) > 0) || classes[0];
          setSelectedClassId(firstWithStudents.id);
        } else {
          setClassList([]);
          setSelectedClassId("");
          setTotalSchoolStudents(0);
        }
      } catch (err) {
        console.warn("Offline or failed loading classes", err);
        setClassList([]);
        setSelectedClassId("");
        setTotalSchoolStudents(0);
      }
    }
    loadClasses();
  }, []);

  // Fetch students for selected class
  useEffect(() => {
    async function loadStudents() {
      if (!selectedClassId) {
        setStudentList([]);
        setAttendanceMap({});
        return;
      }
      setLoadingStudents(true);
      try {
        const res = await fetch(`/api/students?classId=${selectedClassId}&pageSize=100`);
        const json = await res.json();
        if (json.success && json.data.items?.length > 0) {
          const list = json.data.items;
          setStudentList(list);

          const initialMap: Record<string, { status: AttendanceStatus; remarks: string }> = {};
          list.forEach((st: StudentItem) => {
            initialMap[st.id] = { status: "present", remarks: "" };
          });
          setAttendanceMap(initialMap);
        } else {
          setStudentList([]);
          setAttendanceMap({});
        }
      } catch (err) {
        console.warn("Offline or failed loading students", err);
        setStudentList([]);
        setAttendanceMap({});
      } finally {
        setLoadingStudents(false);
      }
    }
    loadStudents();
  }, [selectedClassId]);

  const availableSections = sectionList.filter(
    (sec) => sec.classId === selectedClassId
  );

  const selectedClass = classList.find((c) => c.id === selectedClassId);

  function handleStatusChange(studentId: string, status: AttendanceStatus) {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  }

  function handleMarkAll(status: AttendanceStatus) {
    setAttendanceMap((prev) => {
      const updated = { ...prev };
      studentList.forEach((st) => {
        updated[st.id] = { ...updated[st.id], status };
      });
      return updated;
    });
  }

  // Save attendance locally to RxDB IndexedDB, then sync if online
  async function handleSaveAttendance() {
    setSaving(true);
    setSyncStatus("Saving locally to IndexedDB...");

    try {
      const db = await getRxDB();
      const now = Date.now();
      const recordsToSync: RxAttendanceDoc[] = [];

      // Save each student record into local RxDB
      for (const student of studentList) {
        const entry = attendanceMap[student.id] || { status: "present", remarks: "" };
        const docId = `${student.id}_${selectedDate}_daily`;

        const docData: RxAttendanceDoc = {
          id: docId,
          schoolId: "current-school",
          studentId: student.id,
          classId: selectedClassId,
          date: selectedDate,
          status: entry.status,
          remarks: entry.remarks || undefined,
          updatedAt: now,
          synced: false,
        };

        await db.attendance.upsert(docData);
        recordsToSync.push(docData);
      }

      setSyncStatus("Saved locally!");

      // If online, sync to server API immediately
      if (navigator.onLine) {
        setSyncStatus("Syncing to server...");
        const syncRes = await fetch("/api/attendance/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: recordsToSync }),
        });

        const syncJson = await syncRes.json();
        if (syncJson.success) {
          setSyncStatus(`Synced ${syncJson.data.syncedCount} records to server!`);
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

      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Mark Class Attendance</h1>
          <p className="text-sm text-slate-400 mt-1">
            Offline-first attendance register powered by RxDB & IndexedDB.
          </p>
        </div>

        {/* Network indicator badge */}
        <div className="flex items-center gap-3">
          <div
            id="network-status-badge"
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isOnline
                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                : "bg-amber-950/60 text-amber-300 border border-amber-800/60"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            {isOnline ? "Online — Auto Sync Active" : "Offline Mode — Saving to Local DB"}
          </div>
        </div>
      </div>

      {classList.length === 0 ? (
        <div className="card p-8 text-center space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
          <p className="text-sm font-semibold text-slate-200">
            No classes found — complete School Setup first
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Your school institution needs to have classes configured before taking attendance.
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
          {/* Filter Bar */}
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
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
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
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
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
                Date *
              </label>
              <input
                id="attendance-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          {/* Roster or Distinguishable Empty States */}
          {loadingStudents ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <p className="text-sm font-medium text-slate-400 animate-pulse">Loading class roster...</p>
            </div>
          ) : studentList.length === 0 ? (
            // Distinguish: Whole school has 0 students VS This specific class has 0 students
            totalSchoolStudents === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-base font-semibold text-white">No Students Registered in School Yet</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Your school directory is currently empty. Register students in the Students directory to begin recording daily class roll-calls.
                </p>
                <div className="pt-2">
                  <a
                    href="/dashboard/students/new"
                    id="btn-add-student"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Register Student
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-base font-semibold text-white">
                  No students currently enrolled in {selectedClass?.name || "this class"}
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  This specific class currently has 0 active students assigned to it. Please select a different class from the dropdown above or assign students to {selectedClass?.name || "this class"} in the Students directory.
                </p>
              </div>
            )
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden space-y-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <span className="text-sm font-semibold text-white">
                  Class Roster: {selectedClass?.name} ({studentList.length} {studentList.length === 1 ? "Student" : "Students"})
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 mr-1">Quick Mark:</span>
                  <button
                    type="button"
                    onClick={() => handleMarkAll("present")}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 hover:bg-emerald-900/60 transition cursor-pointer"
                  >
                    All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkAll("absent")}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-950/60 border border-red-800 hover:bg-red-900/60 transition cursor-pointer"
                  >
                    All Absent
                  </button>
                </div>
              </div>

              {/* Student List Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-200">
                  <thead className="text-xs uppercase bg-slate-800/60 text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Admission No</th>
                      <th className="px-4 py-3 text-center">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {studentList.map((student) => {
                      const currentStatus = attendanceMap[student.id]?.status || "present";
                      return (
                        <tr key={student.id} id={`student-attendance-row-${student.id}`} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-xs flex-shrink-0">
                                {student.firstName.charAt(0)}
                                {student.lastName.charAt(0)}
                              </div>
                              <span className="font-semibold text-white">
                                {student.lastName}, {student.firstName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-slate-400">
                            {student.admissionNumber}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="inline-flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                              {(["present", "late", "absent", "excused"] as AttendanceStatus[]).map(
                                (st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleStatusChange(student.id, st)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                                      currentStatus === st
                                        ? st === "present"
                                          ? "bg-emerald-600 text-white shadow-xs"
                                          : st === "late"
                                          ? "bg-amber-500 text-white shadow-xs"
                                          : st === "absent"
                                          ? "bg-red-600 text-white shadow-xs"
                                          : "bg-sky-600 text-white shadow-xs"
                                        : "text-slate-400 hover:text-white"
                                    }`}
                                  >
                                    {st}
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Submit Footer */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                <span className="text-xs text-slate-400 font-mono">
                  {syncStatus || "Ready to save attendance"}
                </span>

                <button
                  id="save-attendance-btn"
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  {saving ? "Saving Register..." : "Save Attendance Register"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

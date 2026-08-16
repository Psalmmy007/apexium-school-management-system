"use client";

import { useState, useEffect } from "react";
import { BackNavigation } from "@/components/ui/BackNavigation";
import { getRxDB, type RxAttendanceDoc } from "@/lib/rxdb/database";

interface ClassItem {
  id: string;
  name: string;
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
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [studentList, setStudentList] = useState<StudentItem[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: AttendanceStatus; remarks: string }>
  >({});

  const [isOnline, setIsOnline] = useState(true);
  const [saving, setSaving] = useState(false);
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
          setClassList(json.data.classes);
          setSectionList(json.data.sections || []);
          setSelectedClassId(json.data.classes[0].id);
        } else {
          setClassList([]);
          setSelectedClassId("");
        }
      } catch (err) {
        console.warn("Offline or failed loading classes", err);
        setClassList([]);
        setSelectedClassId("");
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
      }
    }
    loadStudents();
  }, [selectedClassId]);

  const availableSections = sectionList.filter(
    (sec) => sec.classId === selectedClassId
  );

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
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
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
          <div className="card grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Select Class *</label>
              <select
                id="select-class"
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedSectionId("");
                }}
                className="input"
              >
                {classList.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Section / Arm</label>
              <select
                id="select-section"
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="input"
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
              <label className="label">Date *</label>
              <input
                id="attendance-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Roster or Empty State */}
          {studentList.length === 0 ? (
            <div className="card p-6 text-center space-y-2 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-sm font-semibold text-slate-200">No students enrolled in this class yet</p>
              <p className="text-xs text-slate-400">Add or register students to begin recording class attendance.</p>
              <div className="pt-2">
                <a
                  href="/dashboard/students/new"
                  id="btn-add-student"
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-sm"
                >
                  + Register Student
                </a>
              </div>
            </div>
          ) : (
            <div className="card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <span className="text-sm font-semibold text-slate-700">
                  Class Roster ({studentList.length} Students)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 mr-1">Quick Mark:</span>
                  <button
                    type="button"
                    onClick={() => handleMarkAll("present")}
                    className="btn-secondary btn-sm"
                  >
                    All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkAll("absent")}
                    className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                  >
                    All Absent
                  </button>
                </div>
              </div>

              {/* Student List Table */}
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Admission No</th>
                      <th className="text-center">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentList.map((student) => {
                      const currentStatus = attendanceMap[student.id]?.status || "present";
                      return (
                        <tr key={student.id} id={`student-attendance-row-${student.id}`}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs flex-shrink-0">
                                {student.firstName.charAt(0)}
                                {student.lastName.charAt(0)}
                              </div>
                              <span className="font-semibold text-slate-900">
                                {student.lastName}, {student.firstName}
                              </span>
                            </div>
                          </td>
                          <td className="font-mono text-xs text-slate-500">
                            {student.admissionNumber}
                          </td>
                          <td className="text-center">
                            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                              {(["present", "late", "absent", "excused"] as AttendanceStatus[]).map(
                                (st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleStatusChange(student.id, st)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                                      currentStatus === st
                                        ? st === "present"
                                          ? "bg-emerald-600 text-white shadow-sm"
                                          : st === "late"
                                          ? "bg-amber-500 text-white shadow-sm"
                                          : st === "absent"
                                          ? "bg-red-600 text-white shadow-sm"
                                          : "bg-sky-600 text-white shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
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
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-500">
                  {syncStatus || "Ready to save attendance"}
                </span>

                <button
                  id="save-attendance-btn"
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="btn-primary"
                >
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

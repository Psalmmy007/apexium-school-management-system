"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface StaffMember {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: "present" | "absent" | "late" | "excused";
  remarks: string;
}

export default function StaffAttendancePage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadStaffAttendance() {
      setLoading(true);
      try {
        const res = await fetch(`/api/attendance/staff?date=${selectedDate}`);
        const json = await res.json();
        if (json.success) {
          setStaffList(json.data.items || []);
        }
      } catch (err) {
        console.error("Failed loading staff attendance", err);
      } finally {
        setLoading(false);
      }
    }
    loadStaffAttendance();
  }, [selectedDate]);

  function handleStatusChange(
    userId: string,
    status: "present" | "absent" | "late" | "excused"
  ) {
    setStaffList((prev) =>
      prev.map((item) =>
        item.userId === userId ? { ...item, status } : item
      )
    );
  }

  function handleMarkAll(status: "present" | "absent" | "late" | "excused") {
    setStaffList((prev) => prev.map((item) => ({ ...item, status })));
  }

  async function handleSave() {
    setSaving(true);
    setStatusMessage("Saving staff attendance register...");

    try {
      const records = staffList.map((s) => ({
        userId: s.userId,
        status: s.status,
        remarks: s.remarks,
      }));

      const res = await fetch("/api/attendance/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, records }),
      });

      const json = await res.json();
      if (json.success) {
        setStatusMessage(`Successfully saved attendance for ${json.data.updatedCount} staff members!`);
      } else {
        setStatusMessage(json.error || "Failed to save attendance");
      }
    } catch (err: any) {
      setStatusMessage(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff & Teacher Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track daily attendance register for teachers and school administrative staff.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/attendance" className="btn-secondary btn-sm">
            Student Register →
          </Link>
        </div>
      </div>

      {/* Date selector card */}
      <div className="card max-w-md">
        <label className="label">Attendance Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input"
        />
      </div>

      {/* Roster & Quick Actions */}
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <span className="text-sm font-semibold text-slate-700">
            Staff Members ({staffList.length})
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

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Loading staff register...
          </div>
        ) : staffList.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No active staff members found.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => (
                  <tr key={staff.userId}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center font-bold text-sky-700 text-xs flex-shrink-0">
                          {staff.firstName.charAt(0)}
                          {staff.lastName.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-900">
                          {staff.firstName} {staff.lastName}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge-teacher capitalize">{staff.role}</span>
                    </td>
                    <td className="text-xs text-slate-500">{staff.email}</td>
                    <td className="text-center">
                      <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        {(["present", "late", "absent", "excused"] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleStatusChange(staff.userId, st)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                              staff.status === st
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
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-500">
            {statusMessage || "Click Save to update staff register"}
          </span>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || staffList.length === 0}
            className="btn-primary"
          >
            {saving ? "Saving Register..." : "Save Staff Attendance"}
          </button>
        </div>
      </div>
    </div>
  );
}

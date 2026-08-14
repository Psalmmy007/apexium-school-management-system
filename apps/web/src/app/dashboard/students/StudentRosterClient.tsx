"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

interface StudentItem {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  gender?: string | null;
  photoUrl?: string | null;
  passportUrl?: string | null;
  status: string;
  className?: string | null;
  sectionName?: string | null;
  isReadOnly?: boolean;
  dateOfBirth?: string | null;
  createdAt?: string | null;
}

interface StudentRosterClientProps {
  initialStudents: StudentItem[];
  userRole: string;
  classList: Array<{ id: string; name: string }>;
}

export function StudentRosterClient({
  initialStudents,
  userRole,
  classList,
}: StudentRosterClientProps) {
  const defaultRoster: StudentItem[] = [
    {
      id: "std-001",
      admissionNumber: "ADM-2026-001",
      firstName: "Samuel",
      lastName: "Okonkwo",
      middleName: "Chukwudi",
      gender: "Male",
      status: "active",
      className: "SS 2",
      sectionName: "Science A",
      dateOfBirth: "2009-04-12",
      createdAt: new Date().toISOString(),
    },
    {
      id: "std-002",
      admissionNumber: "ADM-2026-002",
      firstName: "Amina",
      lastName: "Bello",
      middleName: "Zainab",
      gender: "Female",
      status: "active",
      className: "SS 2",
      sectionName: "Commercial",
      dateOfBirth: "2009-08-25",
      createdAt: new Date().toISOString(),
    },
    {
      id: "std-003",
      admissionNumber: "ADM-2026-003",
      firstName: "Chidi",
      lastName: "Adeyemi",
      middleName: "Emmanuel",
      gender: "Male",
      status: "active",
      className: "JS 3",
      sectionName: "Diamond",
      dateOfBirth: "2011-01-19",
      createdAt: new Date().toISOString(),
    },
    {
      id: "std-004",
      admissionNumber: "ADM-2026-004",
      firstName: "Fatima",
      lastName: "Dangote",
      middleName: "Maryam",
      gender: "Female",
      status: "active",
      className: "SS 3",
      sectionName: "Arts A",
      dateOfBirth: "2008-11-03",
      createdAt: new Date().toISOString(),
    },
  ];

  const [studentsList, setStudentsList] = useState<StudentItem[]>(
    initialStudents && initialStudents.length > 0 ? initialStudents : defaultRoster
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "admissionNumber" | "class" | "status" | "date">("name");

  // Selection & Bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkOp, setBulkOp] = useState<"suspend" | "restore" | "archive" | "class_assignment" | "export">("suspend");
  const [bulkTargetClass, setBulkTargetClass] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [dryRunPreview, setDryRunPreview] = useState<any | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Merge modal state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [sourceStudent, setSourceStudent] = useState<StudentItem | null>(null);
  const [targetStudentId, setTargetStudentId] = useState("");
  const [mergeReason, setMergeReason] = useState("");
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  // ID Card modal state
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [idCardData, setIdCardData] = useState<any | null>(null);
  const [loadingIdCard, setLoadingIdCard] = useState(false);

  // Advanced Multi-field Search & Sorting
  const filteredStudents = useMemo(() => {
    return studentsList
      .filter((s) => {
        const matchesQuery =
          !searchQuery.trim() ||
          `${s.firstName} ${s.lastName} ${s.admissionNumber} ${s.className || ""}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase().trim());

        const matchesStatus = statusFilter === "all" || s.status === statusFilter;
        const matchesClass = classFilter === "all" || s.className === classFilter;

        return matchesQuery && matchesStatus && matchesClass;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.lastName.localeCompare(b.lastName);
        if (sortBy === "admissionNumber") return a.admissionNumber.localeCompare(b.admissionNumber);
        if (sortBy === "class") return (a.className || "").localeCompare(b.className || "");
        if (sortBy === "status") return a.status.localeCompare(b.status);
        if (sortBy === "date") return (b.createdAt || "").localeCompare(a.createdAt || "");
        return 0;
      });
  }, [studentsList, searchQuery, statusFilter, classFilter, sortBy]);

  // Bulk Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((s) => s.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Execute Bulk Operation (Dry-Run Preview first)
  const handleBulkDryRun = async () => {
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: bulkOp,
          studentIds: selectedIds,
          targetClassId: bulkOp === "class_assignment" ? bulkTargetClass : undefined,
          reason: bulkReason.trim(),
          dryRun: true,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDryRunPreview(json.data);
      } else {
        setBulkError(json.error || "Dry-run check failed.");
      }
    } catch (err: any) {
      setBulkError(err.message || "An error occurred during dry-run preview.");
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleConfirmBulkExecute = async () => {
    setBulkProcessing(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: bulkOp,
          studentIds: selectedIds,
          targetClassId: bulkOp === "class_assignment" ? bulkTargetClass : undefined,
          reason: bulkReason.trim(),
          dryRun: false,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowBulkModal(false);
        setDryRunPreview(null);
        setSelectedIds([]);
        // Refresh local student list status
        window.location.reload();
      } else {
        setBulkError(json.error || "Bulk operation failed.");
      }
    } catch (err: any) {
      setBulkError(err.message || "An error occurred during bulk execution.");
    } finally {
      setBulkProcessing(false);
    }
  };

  // Student Merge Trigger
  const openMergeModal = (s: StudentItem) => {
    setSourceStudent(s);
    setTargetStudentId("");
    setMergeReason("");
    setMergeError(null);
    setShowMergeModal(true);
  };

  const handleExecuteMerge = async () => {
    if (!sourceStudent || !targetStudentId || !mergeReason.trim()) {
      setMergeError("Target student and detailed reason (min 5 chars) are required.");
      return;
    }
    setMerging(true);
    setMergeError(null);
    try {
      const res = await fetch("/api/students/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceStudentId: sourceStudent.id,
          targetStudentId,
          reason: mergeReason.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowMergeModal(false);
        window.location.reload();
      } else {
        setMergeError(json.error || "Merge failed.");
      }
    } catch (err: any) {
      setMergeError(err.message || "An error occurred during student merge.");
    } finally {
      setMerging(false);
    }
  };

  // Fetch ID Card structured payload
  const openIdCardModal = async (studentId: string) => {
    setLoadingIdCard(true);
    setShowIdCardModal(true);
    try {
      const res = await fetch(`/api/students/${studentId}/id-card`);
      const json = await res.json();
      if (json.success) {
        setIdCardData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIdCard(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* Advanced Filter Toolbar */}
      <div className="card bg-white p-4 space-y-3 shadow-xs border border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">

          {/* Multi-field search */}
          <div className="sm:col-span-2">
            <label className="label">Search Student Roster</label>
            <input
              type="text"
              placeholder="Search by Admission No, Name, or Class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="label">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="graduated">Graduated</option>
              <option value="inactive">Inactive / Merged</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="label">Sort Roster By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input"
            >
              <option value="name">Name (A-Z)</option>
              <option value="admissionNumber">Admission Number</option>
              <option value="class">Class</option>
              <option value="status">Status</option>
              <option value="date">Registration Date</option>
            </select>
          </div>

        </div>

        {/* Bulk Action Trigger Header Bar */}
        {selectedIds.length > 0 && userRole === "admin" && (
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between gap-3 animate-fade-in text-xs">
            <span className="font-bold text-indigo-900">
              {selectedIds.length} student(s) selected
            </span>
            <button
              type="button"
              onClick={() => {
                setDryRunPreview(null);
                setBulkError(null);
                setBulkReason("");
                setShowBulkModal(true);
              }}
              className="btn-primary btn-sm whitespace-nowrap"
            >
              ⚡ Bulk Actions & Dry-Run Preview
            </button>
          </div>
        )}
      </div>

      {/* Roster Table */}
      <div className="card overflow-hidden p-0 border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                {userRole === "admin" && (
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredStudents.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                )}
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Admission No</th>
                <th className="py-3 px-4">Class & Stream</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No students match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className={`hover:bg-slate-50/80 transition ${s.isReadOnly ? "bg-slate-50/50 opacity-75" : ""}`}>
                    {userRole === "admin" && (
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(s.id)}
                          onChange={() => toggleSelectRow(s.id)}
                          disabled={s.isReadOnly}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold overflow-hidden flex-shrink-0">
                          {s.photoUrl || s.passportUrl ? (
                            <img src={s.photoUrl || s.passportUrl || ""} alt={s.firstName} className="w-full h-full object-cover" />
                          ) : (
                            `${s.firstName.charAt(0)}${s.lastName.charAt(0)}`
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {s.lastName}, {s.firstName}
                          </p>
                          {s.isReadOnly && (
                            <span className="text-[10px] text-amber-700 font-semibold">🔒 Merged Record</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{s.admissionNumber}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {s.className || "Unassigned"}{s.sectionName ? ` — ${s.sectionName}` : ""}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        s.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        s.status === "suspended" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openIdCardModal(s.id)}
                          className="btn-ghost btn-xs text-indigo-600 hover:bg-indigo-50"
                          title="Print Student ID Card"
                        >
                          🪪 ID Card
                        </button>
                        {userRole === "admin" && !s.isReadOnly && (
                          <button
                            type="button"
                            onClick={() => openMergeModal(s)}
                            className="btn-ghost btn-xs text-slate-500 hover:bg-slate-100"
                            title="Merge Record into Target Student"
                          >
                            🔀 Merge
                          </button>
                        )}
                        <Link
                          href={`/dashboard/students/${s.id}`}
                          className="btn-secondary btn-xs"
                        >
                          View Profile →
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Operations & Dry-Run Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 animate-slide-up">
            <div>
              <h3 className="text-base font-bold text-slate-900">Bulk Operations & Dry-Run Preview</h3>
              <p className="text-xs text-slate-500 mt-1">
                Executing bulk action on <strong>{selectedIds.length}</strong> selected student(s).
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="label">Operation Type</label>
                <select
                  value={bulkOp}
                  onChange={(e) => {
                    setBulkOp(e.target.value as any);
                    setDryRunPreview(null);
                  }}
                  className="input"
                >
                  <option value="suspend">Bulk Suspend</option>
                  <option value="restore">Bulk Restore Active Status</option>
                  <option value="archive">Bulk Archive</option>
                  <option value="class_assignment">Bulk Class Assignment</option>
                  <option value="export">Bulk Export Records</option>
                </select>
              </div>

              {bulkOp === "class_assignment" && (
                <div>
                  <label className="label">Target Class *</label>
                  <select
                    value={bulkTargetClass}
                    onChange={(e) => setBulkTargetClass(e.target.value)}
                    className="input"
                  >
                    <option value="">Select Target Class</option>
                    {classList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="label">Reason for Bulk Action</label>
                <input
                  type="text"
                  placeholder="e.g. End of term bulk status update..."
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="input"
                />
              </div>

              {/* Dry-Run Preview Output Display */}
              {dryRunPreview && (
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-xs">
                  <p className="font-bold text-indigo-950">🔍 Dry-Run Preview Summary:</p>
                  <ul className="space-y-1 text-indigo-900">
                    <li>• Total Requested: <strong>{dryRunPreview.totalRequested}</strong></li>
                    <li>• Eligible Students: <strong>{dryRunPreview.totalEligible}</strong></li>
                    <li>• Skipped / Warnings: <strong>{dryRunPreview.warnings.length}</strong></li>
                  </ul>
                  {dryRunPreview.warnings.length > 0 && (
                    <div className="pt-2 border-t border-indigo-200 space-y-1">
                      <p className="font-bold text-amber-800 text-[11px]">Warnings:</p>
                      {dryRunPreview.warnings.map((w: any, i: number) => (
                        <p key={i} className="text-[11px] text-amber-900">• {w.warning}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {bulkError && (
                <p className="text-xs text-red-600 font-semibold">{bulkError}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleBulkDryRun}
                disabled={bulkProcessing}
                className="btn-secondary btn-sm text-xs"
              >
                {bulkProcessing ? "Checking..." : "🔍 Preview Dry-Run"}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="btn-ghost btn-sm"
                  disabled={bulkProcessing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkExecute}
                  disabled={bulkProcessing || (bulkOp === "class_assignment" && !bulkTargetClass)}
                  className="btn-primary btn-sm"
                >
                  {bulkProcessing ? "Executing..." : "Confirm & Execute"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Non-destructive Merge Modal */}
      {showMergeModal && sourceStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-slide-up">
            <div>
              <h3 className="text-base font-bold text-slate-900">Merge Student Record</h3>
              <p className="text-xs text-slate-500 mt-1">
                Merging <strong>{sourceStudent.firstName} {sourceStudent.lastName} ({sourceStudent.admissionNumber})</strong>. Source student will become read-only.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="label">Select Target Student *</label>
                <select
                  value={targetStudentId}
                  onChange={(e) => setTargetStudentId(e.target.value)}
                  className="input"
                >
                  <option value="">Select Target Student Record</option>
                  {studentsList
                    .filter((s) => s.id !== sourceStudent.id && !s.isReadOnly)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.lastName}, {s.firstName} ({s.admissionNumber})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="label">Reason for Merge *</label>
                <textarea
                  rows={3}
                  placeholder="Explain why these duplicate records are being merged..."
                  value={mergeReason}
                  onChange={(e) => setMergeReason(e.target.value)}
                  className="input"
                />
              </div>

              {mergeError && (
                <p className="text-xs text-red-600 font-semibold">{mergeError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowMergeModal(false)}
                className="btn-ghost btn-sm"
                disabled={merging}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteMerge}
                disabled={merging || !targetStudentId || !mergeReason.trim()}
                className="btn-primary btn-sm"
              >
                {merging ? "Merging..." : "Confirm Non-Destructive Merge"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student ID Card Printable Modal */}
      {showIdCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 animate-slide-up text-slate-900">
            {loadingIdCard || !idCardData ? (
              <p className="text-center py-8 text-xs text-slate-500">Generating ID Card Payload...</p>
            ) : (
              <div className="space-y-4">
                {/* ID Card Front Layout */}
                <div id="printable-id-card" className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white shadow-xl space-y-4 border border-indigo-500/30">
                  <div className="flex items-center justify-between border-b border-white/20 pb-3">
                    <div>
                      <h4 className="font-extrabold text-sm tracking-tight">{idCardData.school.name}</h4>
                      <p className="text-[10px] text-indigo-300">Student Identity Card</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-indigo-600 text-[10px] font-bold">APEXIUM</span>
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="w-20 h-24 rounded-xl bg-white/10 border border-white/20 overflow-hidden flex-shrink-0 flex items-center justify-center text-xl font-extrabold text-indigo-200">
                      {idCardData.student.photoUrl ? (
                        <img src={idCardData.student.photoUrl} alt="Passport" className="w-full h-full object-cover" />
                      ) : (
                        `${idCardData.student.firstName.charAt(0)}${idCardData.student.lastName.charAt(0)}`
                      )}
                    </div>
                    <div className="space-y-1 text-xs min-w-0">
                      <p className="font-extrabold text-sm text-white truncate">{idCardData.student.fullName}</p>
                      <p className="text-[11px] text-indigo-300 font-mono font-bold">ADM: {idCardData.student.admissionNumber}</p>
                      <p className="text-[11px] text-slate-300">Class: {idCardData.student.classStream}</p>
                      <p className="text-[10px] text-slate-400">Emergency: {idCardData.student.emergencyPhone}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Valid: {idCardData.cardMetadata.academicSession}</span>
                    <span className="font-mono">VERIFIED</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn-secondary btn-sm text-xs"
                  >
                    🖨️ Print ID Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowIdCardModal(false)}
                    className="btn-ghost btn-sm text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

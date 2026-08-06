"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface TimelineEvent {
  id: string;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  performedBy?: string;
}

interface StudentDetail {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender?: string;
  dateOfBirth?: string;
  admissionDate?: string;
  stateOfOrigin?: string;
  lga?: string;
  nationality?: string;
  religion?: string;
  bloodGroup?: string;
  genotype?: string;
  address?: string;
  passportUrl?: string;
  photoUrl?: string;
  className?: string;
  sectionName?: string;
  status: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  medicalConditions?: string;
  allergies?: string;
  previousSchool?: string;
  guardians?: Array<{
    id: string;
    relationship: string;
    isPrimary: boolean;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  active:     { label: "Active",     color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  inactive:   { label: "Inactive",   color: "text-slate-600",   bg: "bg-slate-100",   border: "border-slate-200" },
  suspended:  { label: "Suspended",  color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200" },
  withdrawn:  { label: "Withdrawn",  color: "text-orange-700",  bg: "bg-orange-50",   border: "border-orange-200" },
  expelled:   { label: "Expelled",   color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200" },
  graduated:  { label: "Graduated",  color: "text-indigo-700",  bg: "bg-indigo-50",   border: "border-indigo-200" },
  transferred:{ label: "Transferred",color: "text-purple-700",  bg: "bg-purple-50",   border: "border-purple-200" },
  alumni:     { label: "Alumni",     color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200" },
};

const EVENT_ICONS: Record<string, string> = {
  admission: "🎓",
  status_change: "🔄",
  class_transfer: "🏫",
  promotion: "⬆️",
  guardian_update: "👨‍👩‍👧",
  document_upload: "📄",
  hostel_allocation: "🏠",
  default: "📋",
};

interface StudentDocumentItem {
  id: string;
  documentType: string;
  title: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
}

export default function StudentProfilePage() {
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [documents, setDocuments] = useState<StudentDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"biodata" | "academic" | "guardians" | "medical" | "documents" | "timeline" | "status">("biodata");

  // Document upload state
  const [showDocModal, setShowDocModal] = useState(false);
  const [docType, setDocType] = useState("birth_certificate");
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  // Status change modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const loadStudent = useCallback(async () => {
    try {
      setLoading(true);
      const [studentRes, timelineRes, docsRes] = await Promise.all([
        fetch(`/api/students/${studentId}`),
        fetch(`/api/students/${studentId}/status`),
        fetch(`/api/students/${studentId}/documents`),
      ]);
      const studentJson = await studentRes.json();
      const timelineJson = await timelineRes.json();
      const docsJson = await docsRes.json();

      if (studentJson.success) setStudent(studentJson.data);
      if (timelineJson.success) setTimeline(timelineJson.data.timeline || []);
      if (docsJson.success) setDocuments(docsJson.data || []);
    } catch (err) {
      console.error("Failed loading student profile", err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);


  useEffect(() => {
    if (studentId) loadStudent();
  }, [studentId, loadStudent]);

  const openStatusModal = (newStatus: string) => {
    if (newStatus === student?.status) return;
    setPendingStatus(newStatus);
    setStatusReason("");
    setStatusError(null);
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    if (!statusReason.trim() || statusReason.trim().length < 3) {
      setStatusError("Please provide a reason (minimum 3 characters).");
      return;
    }
    setSavingStatus(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/students/${studentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: pendingStatus, reason: statusReason.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setStudent((prev) => prev ? { ...prev, status: pendingStatus } : null);
        setShowStatusModal(false);
        // Reload timeline to show the new event
        const timelineRes = await fetch(`/api/students/${studentId}/status`);
        const timelineJson = await timelineRes.json();
        if (timelineJson.success) setTimeline(timelineJson.data.timeline || []);
      } else {
        setStatusError(json.error || "Failed to update status.");
      }
    } catch (err: any) {
      setStatusError(err.message || "An error occurred.");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!docTitle.trim() || !docFile) {
      setDocError("Document title and file are required.");
      return;
    }
    setUploadingDoc(true);
    setDocError(null);
    try {
      const formData = new FormData();
      formData.append("file", docFile);
      const uploadRes = await fetch("/api/upload/document", {
        method: "POST",
        body: formData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadJson.success) {
        setDocError(uploadJson.error || "File upload failed.");
        setUploadingDoc(false);
        return;
      }

      const saveRes = await fetch(`/api/students/${studentId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: docType,
          title: docTitle.trim(),
          fileUrl: uploadJson.url,
          fileSize: uploadJson.fileSize,
          mimeType: uploadJson.mimeType,
        }),
      });
      const saveJson = await saveRes.json();
      if (saveJson.success) {
        setDocuments((prev) => [saveJson.data, ...prev]);
        setShowDocModal(false);
        setDocTitle("");
        setDocFile(null);
        // Refresh timeline
        const timelineRes = await fetch(`/api/students/${studentId}/status`);
        const timelineJson = await timelineRes.json();
        if (timelineJson.success) setTimeline(timelineJson.data.timeline || []);
      } else {
        setDocError(saveJson.error || "Failed to attach document.");
      }
    } catch (err: any) {
      setDocError(err.message || "An error occurred.");
    } finally {
      setUploadingDoc(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading student profile…</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Student Not Found</h2>
        <Link href="/dashboard/students" className="btn-primary">Back to Students Roster</Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[student.status] || STATUS_CONFIG.inactive;
  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Back navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard/students" className="btn-ghost btn-sm text-slate-500">
          ← Back to Students
        </Link>
        <Link href={`/dashboard/students/${student.id}/edit`} className="btn-secondary btn-sm">
          ✏️ Edit Profile
        </Link>
      </div>

      {/* Hero Banner */}
      <div className="card flex flex-col md:flex-row items-center md:items-start gap-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border-0 shadow-xl">
        {/* Passport Photo */}
        <div className="w-32 h-40 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md">
          {student.passportUrl || student.photoUrl ? (
            <img src={student.passportUrl || student.photoUrl} alt={student.firstName} className="w-full h-full object-cover object-top" />
          ) : (
            <span className="text-3xl font-extrabold text-indigo-200">{initials}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 space-y-3 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div>
              <span className="text-xs font-mono font-bold text-indigo-300 uppercase tracking-widest">{student.admissionNumber}</span>
              <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">
                {student.lastName}, {student.firstName}{student.middleName ? ` ${student.middleName}` : ""}
              </h1>
            </div>

            {/* Status Badge + Change button */}
            <div className="flex items-center gap-2 justify-center md:justify-end">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                {statusCfg.label}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("status")}
                className="text-xs text-indigo-300 hover:text-white font-semibold transition"
              >
                Change →
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-300">
            <div>
              <span className="text-slate-400">Class:</span>{" "}
              <strong className="text-white">{student.className || "Unassigned"}{student.sectionName ? ` — ${student.sectionName}` : ""}</strong>
            </div>
            <div>
              <span className="text-slate-400">Gender:</span>{" "}
              <strong className="text-white capitalize">{student.gender || "N/A"}</strong>
            </div>
            <div>
              <span className="text-slate-400">Admitted:</span>{" "}
              <strong className="text-white">{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}</strong>
            </div>
            <div>
              <span className="text-slate-400">D.O.B:</span>{" "}
              <strong className="text-white">{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-NG") : "N/A"}</strong>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-3 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-semibold text-white">🩸 {student.bloodGroup || "N/A"}</span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-semibold text-white">🧬 {student.genotype || "N/A"}</span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-semibold text-white">🌍 {student.nationality || "Nigerian"}</span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-semibold text-white">🕌 {student.religion || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-0">
        {[
          { id: "biodata",   label: "Biodata & Origin" },
          { id: "academic",  label: "Academic" },
          { id: "guardians", label: "Guardians" },
          { id: "medical",   label: "Medical" },
          { id: "documents", label: `Documents (${documents.length})` },
          { id: "timeline",  label: `Timeline (${timeline.length})` },
          { id: "status",    label: "Manage Status" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === t.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card space-y-5">

        {/* BIODATA */}
        {activeTab === "biodata" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 text-sm">
            {[
              { label: "State of Origin", value: student.stateOfOrigin },
              { label: "LGA", value: student.lga },
              { label: "Nationality", value: student.nationality || "Nigerian" },
              { label: "Religion", value: student.religion },
              { label: "Blood Group", value: student.bloodGroup },
              { label: "Genotype", value: student.genotype },
            ].map(({ label, value }) => (
              <div key={label}>
                <span className="text-xs text-slate-400 font-semibold block">{label}</span>
                <p className="font-bold text-slate-800 mt-0.5">{value || "N/A"}</p>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-3">
              <span className="text-xs text-slate-400 font-semibold block">Residential Address</span>
              <p className="font-bold text-slate-800 mt-0.5">{student.address || "No address recorded."}</p>
            </div>
          </div>
        )}

        {/* ACADEMIC */}
        {activeTab === "academic" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-400 font-semibold block">Class</span>
                <p className="font-bold text-slate-800 mt-0.5">{student.className || "Unassigned"}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold block">Stream / Arm</span>
                <p className="font-bold text-slate-800 mt-0.5">{student.sectionName || "Unassigned"}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold block">Previous School</span>
                <p className="font-bold text-slate-800 mt-0.5">{student.previousSchool || "None recorded."}</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Link href={`/dashboard/academics?studentId=${student.id}`} className="btn-secondary btn-sm text-xs">
                View Scores & Grades
              </Link>
              <Link href={`/dashboard/attendance?studentId=${student.id}`} className="btn-secondary btn-sm text-xs">
                Attendance History
              </Link>
            </div>
          </div>
        )}

        {/* GUARDIANS */}
        {activeTab === "guardians" && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-slate-900">Linked Guardians</h3>
            {!student.guardians || student.guardians.length === 0 ? (
              <p className="text-sm text-slate-400">No guardian records linked to this student.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {student.guardians.map((g) => (
                  <div key={g.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-slate-900">{g.firstName} {g.lastName}</p>
                      <div className="flex gap-1.5">
                        {g.isPrimary && <span className="badge-primary text-[10px]">Primary</span>}
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold">{g.relationship}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">📞 {g.phone}</p>
                    {g.email && <p className="text-xs text-slate-600">✉️ {g.email}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Emergency Contact</h4>
              {student.emergencyContactName ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs space-y-1">
                  <p className="font-bold text-slate-900">{student.emergencyContactName}</p>
                  <p className="text-slate-600">📞 {student.emergencyContactPhone || "No phone"}</p>
                  {student.emergencyContactRelationship && (
                    <p className="text-slate-600">Relationship: {student.emergencyContactRelationship}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No emergency contact recorded.</p>
              )}
            </div>
          </div>
        )}

        {/* MEDICAL */}
        {activeTab === "medical" && (
          <div className="space-y-4 text-sm">
            {[
              { label: "Medical Conditions", value: student.medicalConditions },
              { label: "Known Allergies", value: student.allergies },
            ].map(({ label, value }) => (
              <div key={label}>
                <span className="text-xs text-slate-400 font-semibold block">{label}</span>
                <p className={`mt-0.5 font-medium ${value ? "text-slate-800" : "text-slate-400"}`}>
                  {value || "None recorded."}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* DOCUMENTS */}
        {activeTab === "documents" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Student Document Management</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Admission documents, birth certificates, transfer letters, academic transcripts, and medical reports.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDocError(null);
                  setDocTitle("");
                  setDocFile(null);
                  setShowDocModal(true);
                }}
                className="btn-primary btn-sm text-xs"
              >
                + Upload Document
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-2 text-2xl">📄</div>
                <p className="text-sm font-semibold text-slate-700">No documents attached</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Upload birth certificates, previous academic records, transfer letters, or medical records for this student.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold uppercase">
                        {doc.documentType.replace(/_/g, " ")}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 truncate">{doc.title}</h4>
                      <p className="text-[11px] text-slate-400">
                        Uploaded: {new Date(doc.createdAt).toLocaleDateString("en-NG")}
                        {doc.fileSize ? ` • ${(doc.fileSize / 1024).toFixed(0)} KB` : ""}
                      </p>
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary btn-xs text-xs whitespace-nowrap"
                    >
                      View / Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY TIMELINE */}
        {activeTab === "timeline" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Student Activity Timeline</h3>
            <p className="text-xs text-slate-500">
              Immutable audit history of all events for this student — admissions, status changes, class transfers, promotions, and more.
            </p>

            {timeline.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-2xl">📋</div>
                <p className="text-sm font-medium text-slate-500">No activity recorded yet.</p>
                <p className="text-xs text-slate-400 mt-1">Events will appear here as they occur.</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
                <div className="space-y-4 pl-12">
                  {[...timeline].reverse().map((event, idx) => (
                    <div key={event.id} className="relative">
                      {/* Circle marker */}
                      <div className="absolute -left-8 w-6 h-6 rounded-full bg-white border-2 border-indigo-300 flex items-center justify-center text-xs">
                        {EVENT_ICONS[event.eventType] || EVENT_ICONS.default}
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-indigo-700 capitalize">
                            {event.eventType.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(event.createdAt).toLocaleString("en-NG", {
                              day: "numeric", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MANAGE STATUS */}
        {activeTab === "status" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Manage Student Status</h3>
              <p className="text-xs text-slate-500 mt-1">
                All status changes are permanently logged. A reason is required for every change.
              </p>
            </div>

            {/* Current status */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Current Status</span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                {statusCfg.label}
              </span>
            </div>

            {/* Status options */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  disabled={key === student.status}
                  onClick={() => openStatusModal(key)}
                  className={`p-3 rounded-xl border text-xs font-bold transition text-left ${
                    key === student.status
                      ? `${cfg.bg} ${cfg.color} ${cfg.border} opacity-60 cursor-not-allowed`
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 active:scale-95"
                  }`}
                >
                  <span className="block text-sm mb-0.5">{key === student.status ? "✓" : "→"}</span>
                  {cfg.label}
                  {key === student.status && <span className="block text-[10px] opacity-60 mt-0.5">(current)</span>}
                </button>
              ))}
            </div>

            {/* Recent changes in compact form */}
            {timeline.filter((e) => e.eventType === "status_change").length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Recent Status Changes</h4>
                <div className="space-y-2">
                  {timeline.filter((e) => e.eventType === "status_change").slice(-5).reverse().map((e) => (
                    <div key={e.id} className="flex items-start justify-between gap-2 text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-slate-700 flex-1">{e.description}</p>
                      <span className="text-slate-400 font-mono whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleDateString("en-NG")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-slide-up">
            <div>
              <h3 className="text-base font-bold text-slate-900">Confirm Status Change</h3>
              <p className="text-xs text-slate-500 mt-1">
                Changing <strong>{student.firstName} {student.lastName}</strong> from{" "}
                <span className={`font-bold ${STATUS_CONFIG[student.status]?.color}`}>{STATUS_CONFIG[student.status]?.label}</span>{" "}
                → <span className={`font-bold ${STATUS_CONFIG[pendingStatus]?.color}`}>{STATUS_CONFIG[pendingStatus]?.label}</span>
              </p>
            </div>

            <div>
              <label className="label">Reason for status change *</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Explain why this status is being changed (required for audit trail)…"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
              />
              {statusError && (
                <p className="text-xs text-red-600 mt-1 font-semibold">{statusError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="btn-ghost btn-sm"
                disabled={savingStatus}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusChange}
                disabled={savingStatus || !statusReason.trim()}
                className="btn-primary btn-sm"
              >
                {savingStatus ? "Saving…" : `Set to ${STATUS_CONFIG[pendingStatus]?.label}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-slide-up">
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Student Document</h3>
              <p className="text-xs text-slate-500 mt-1">
                Attach an official document (PDF, Word, JPEG, PNG, max 10MB) to <strong>{student.firstName} {student.lastName}</strong>'s file.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Document Category *</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="input"
                >
                  <option value="birth_certificate">Birth Certificate</option>
                  <option value="transfer_letter">Transfer / Leaving Certificate</option>
                  <option value="academic_record">Previous Academic Transcript / Report</option>
                  <option value="medical_report">Medical Report / Immunisation Record</option>
                  <option value="passport">Passport Photograph Copy</option>
                  <option value="other">Other Official Document</option>
                </select>
              </div>

              <div>
                <label className="label">Document Title / Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Primary School Testimonial 2025"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Select File *</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="input text-xs"
                />
              </div>

              {docError && (
                <p className="text-xs text-red-600 font-semibold">{docError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="btn-ghost btn-sm"
                disabled={uploadingDoc}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadDocument}
                disabled={uploadingDoc || !docTitle.trim() || !docFile}
                className="btn-primary btn-sm"
              >
                {uploadingDoc ? "Uploading..." : "Save Document"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


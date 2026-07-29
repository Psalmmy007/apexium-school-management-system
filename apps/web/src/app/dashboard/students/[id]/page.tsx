"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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

export default function StudentProfileManagementPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<"biodata" | "academic" | "guardians" | "medical">("biodata");

  useEffect(() => {
    async function loadStudent() {
      try {
        setLoading(true);
        const res = await fetch(`/api/students/${studentId}`);
        const json = await res.json();
        if (json.success) {
          setStudent(json.data);
        }
      } catch (err) {
        console.error("Failed loading student details", err);
      } finally {
        setLoading(false);
      }
    }
    if (studentId) loadStudent();
  }, [studentId]);

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setStudent((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-slate-500 font-medium">Loading student profile...</div>;
  }

  if (!student) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Student Not Found</h2>
        <Link href="/dashboard/students" className="btn-primary">
          Back to Students Roster
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard/students" className="btn-ghost btn-sm text-slate-500">
          ← Back to Students
        </Link>

        <div className="flex items-center gap-3">
          <Link href={`/dashboard/students/${student.id}/edit`} className="btn-secondary btn-sm">
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Hero Banner Card */}
      <div className="card flex flex-col md:flex-row items-center md:items-start gap-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-0 shadow-lg">
        {/* Passport Photo */}
        <div className="w-32 h-40 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md">
          {student.passportUrl || student.photoUrl ? (
            <img src={student.passportUrl || student.photoUrl} alt={student.firstName} className="w-full h-full object-cover object-top" />
          ) : (
            <span className="text-3xl font-extrabold text-indigo-200">
              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
            </span>
          )}
        </div>

        {/* Biodata Summary */}
        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono font-bold text-indigo-300 uppercase tracking-widest">
                {student.admissionNumber}
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight">
                {student.lastName}, {student.firstName} {student.middleName ? `${student.middleName}` : ""}
              </h1>
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-2 justify-center">
              <span className="text-xs text-slate-300">Status:</span>
              <select
                value={student.status}
                disabled={updatingStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-white/10 text-white border border-white/20 rounded-lg px-2.5 py-1 text-xs font-bold capitalize focus:ring-2 focus:ring-indigo-400"
              >
                <option value="active" className="text-slate-900">Active</option>
                <option value="suspended" className="text-slate-900">Suspended</option>
                <option value="withdrawn" className="text-slate-900">Withdrawn</option>
                <option value="graduated" className="text-slate-900">Graduated</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-300 pt-2">
            <div>
              <span className="text-slate-400">Class & Stream:</span>{" "}
              <strong className="text-white">{student.className ? `${student.className}${student.sectionName ? ` — ${student.sectionName}` : ""}` : "Unassigned"}</strong>
            </div>
            <div>
              <span className="text-slate-400">Gender:</span>{" "}
              <strong className="text-white capitalize">{student.gender || "N/A"}</strong>
            </div>
            <div>
              <span className="text-slate-400">Admission Date:</span>{" "}
              <strong className="text-white">{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : "N/A"}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { id: "biodata", label: "Full Biodata & Origin" },
          { id: "academic", label: "Academic Record" },
          { id: "guardians", label: "Guardians & Contacts" },
          { id: "medical", label: "Medical History" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === t.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="card space-y-6">
        {activeTab === "biodata" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block">State of Origin</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{student.stateOfOrigin || "N/A"}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">LGA</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{student.lga || "N/A"}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Nationality</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{student.nationality || "Nigerian"}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Religion</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{student.religion || "N/A"}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Blood Group</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{student.bloodGroup || "N/A"}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Genotype</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{student.genotype || "N/A"}</p>
            </div>
            <div className="sm:col-span-3">
              <span className="text-slate-400 font-semibold block">Residential Address</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{student.address || "No address provided."}</p>
            </div>
          </div>
        )}

        {activeTab === "guardians" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Linked Reusable Guardians</h3>
            {(!student.guardians || student.guardians.length === 0) ? (
              <p className="text-xs text-slate-400">No guardian entities linked to this student record.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {student.guardians.map((g) => (
                  <div key={g.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{g.firstName} {g.lastName}</span>
                      <span className="badge-primary">{g.relationship}</span>
                    </div>
                    <p className="text-slate-600">Phone: <strong>{g.phone}</strong></p>
                    {g.email && <p className="text-slate-600">Email: <strong>{g.email}</strong></p>}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase">Emergency Contact</h4>
              <p className="text-xs text-slate-800 mt-1">
                {student.emergencyContactName ? `${student.emergencyContactName} (${student.emergencyContactPhone || "No Phone"})` : "None recorded."}
              </p>
            </div>
          </div>
        )}

        {activeTab === "academic" && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 font-semibold block">Class</span>
                <p className="text-sm font-bold text-slate-800 mt-1">{student.className || "Unassigned"}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Stream / Arm</span>
                <p className="text-sm font-bold text-slate-800 mt-1">{student.sectionName || "Unassigned"}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "medical" && (
          <div className="space-y-4 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block">Medical Conditions</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{student.medicalConditions || "None recorded."}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Allergies</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{student.allergies || "None recorded."}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Previous School Attended</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{student.previousSchool || "None recorded."}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

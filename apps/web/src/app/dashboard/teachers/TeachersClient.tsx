"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BackNavigation } from "@/components/ui/BackNavigation";
import {
  Users,
  GraduationCap,
  Plus,
  Calendar,
  Layers,
  FileText,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { tokens } from "@/lib/design-system/tokens";

interface TeacherItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  employeeNumber?: string | null;
  employmentStatus: string;
  formClasses: Array<{ id: string; name: string; type: string }>;
  taughtSubjects: string[];
  periodsCount: number;
  isActive: boolean;
  createdAt: string;
}

interface ClassOption {
  id: string;
  name: string;
}

export function TeachersClient() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State for Adding Teacher
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formClassId, setFormClassId] = useState("");

  // Modal State for Quick Form Class Assignment
  const [assigningTeacher, setAssigningTeacher] = useState<TeacherItem | null>(null);
  const [selectedFormClass, setSelectedFormClass] = useState("");

  async function loadTeachers() {
    setLoading(true);
    try {
      const res = await fetch("/api/teachers");
      const json = await res.json();
      if (json.success) {
        setTeachers(json.data.teachers || []);
        setClasses(json.data.classes || []);
      } else {
        setError(json.error || "Failed to load teachers");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load teachers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeachers();
  }, []);

  async function handleAddTeacher(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !email) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          formClassId: formClassId || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Teacher ${firstName} ${lastName} created and linked successfully!`);
        setShowAddModal(false);
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setFormClassId("");
        loadTeachers();
      } else {
        setError(json.error || "Failed to create teacher account");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateFormClass(e: React.FormEvent) {
    e.preventDefault();
    if (!assigningTeacher) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/teachers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: assigningTeacher.id,
          formClassId: selectedFormClass || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Form class assignment updated for ${assigningTeacher.firstName} ${assigningTeacher.lastName}!`);
        setAssigningTeacher(null);
        setSelectedFormClass("");
        loadTeachers();
      } else {
        setError(json.error || "Failed to update assignment");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update assignment");
    } finally {
      setSubmitting(false);
    }
  }

  const totalTeachers = teachers.length;
  const formTutorsCount = teachers.filter((t) => t.formClasses.length > 0).length;
  const totalPeriodsAssigned = teachers.reduce((sum, t) => sum + t.periodsCount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-slide-up">
      {/* ── Top Navigation ─────────────────────────────── */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      {/* ── Page Header ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className={tokens.h2}>Teaching Staff & Class Assignments</h1>
          <p className="text-slate-400 text-sm mt-1">
            Roster of school educators, assigned form tutors, and subject timetable workloads.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="btn-add-teacher"
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Teacher</span>
          </button>
        </div>
      </div>

      {/* ── Feedback Banners ───────────────────────────── */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl flex items-center gap-3 text-emerald-300 text-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-2xl flex items-center gap-3 text-red-300 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── KPI Stat Cards ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Teaching Staff
            </span>
            <p className="text-3xl font-extrabold text-white mt-1">{totalTeachers}</p>
            <span className="text-[11px] text-slate-500 font-medium">Active educator accounts</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Assigned Form Tutors
            </span>
            <p className="text-3xl font-extrabold text-white mt-1">{formTutorsCount}</p>
            <span className="text-[11px] text-slate-500 font-medium">Leading class rolls</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Timetable Workload
            </span>
            <p className="text-3xl font-extrabold text-white mt-1">{totalPeriodsAssigned}</p>
            <span className="text-[11px] text-slate-500 font-medium">Scheduled class periods</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-600/20 border border-sky-500/30 text-sky-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Connected System Links ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/dashboard/academics/structure"
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition">Academic Structure</p>
              <p className="text-[11px] text-slate-400">Class arms & streams</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
        </Link>

        <Link
          href="/dashboard/timetable"
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition">Timetable Matrix</p>
              <p className="text-[11px] text-slate-400">Period schedule & clashes</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
        </Link>

        <Link
          href="/dashboard/hr"
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-amber-300 transition">HR & Payroll</p>
              <p className="text-[11px] text-slate-400">Staff contracts & salaries</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
        </Link>
      </div>

      {/* ── Teachers Roster Table ──────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Teaching Faculty Roster ({totalTeachers})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse text-sm">
            Loading teachers directory...
          </div>
        ) : teachers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-base font-semibold text-white">No Teaching Staff Registered Yet</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Add your school&apos;s teachers to assign them as form tutors and schedule their timetable lessons.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add First Teacher
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="text-xs uppercase bg-slate-800/60 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Form Class Assignment</th>
                  <th className="px-4 py-3">Taught Subjects / Workload</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-xs shrink-0">
                          {teacher.firstName.charAt(0)}
                          {teacher.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-white">
                            {teacher.firstName} {teacher.lastName}
                          </p>
                          {teacher.employeeNumber && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {teacher.employeeNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span>{teacher.email}</span>
                        </div>
                        {teacher.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                            <Phone className="w-3 h-3" />
                            <span>{teacher.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {teacher.formClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {teacher.formClasses.map((fc) => (
                            <span
                              key={fc.id}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 inline-flex items-center gap-1"
                            >
                              <UserCheck className="w-3 h-3 text-emerald-400" />
                              {fc.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAssigningTeacher(teacher);
                            setSelectedFormClass("");
                          }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          + Assign Form Class
                        </button>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-white">
                          {teacher.periodsCount} {teacher.periodsCount === 1 ? "Period" : "Periods"} / week
                        </span>
                        {teacher.taughtSubjects.length > 0 ? (
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">
                            {teacher.taughtSubjects.join(", ")}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500 italic">No scheduled timetable periods</p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAssigningTeacher(teacher);
                            setSelectedFormClass(teacher.formClasses[0]?.id || "");
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
                        >
                          Edit Class
                        </button>
                        <Link
                          href="/dashboard/timetable"
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-400 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/60 transition"
                        >
                          Timetable
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Add New Teacher ─────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                Add Teaching Staff Account
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="teacher-first-name" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    First Name *
                  </label>
                  <input
                    id="teacher-first-name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Olawale"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="teacher-last-name" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Last Name *
                  </label>
                  <input
                    id="teacher-last-name"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Adeleke"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="teacher-email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address *
                </label>
                <input
                  id="teacher-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@school.edu.ng"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="teacher-phone" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  id="teacher-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="teacher-form-class" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Assign Form Class (Optional)
                </label>
                <select
                  id="teacher-form-class"
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No Form Class (Subject Specialist Only)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-teacher"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md transition"
                >
                  {submitting ? "Saving Teacher..." : "Save & Provision Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Assign Form Class ───────────────────── */}
      {assigningTeacher && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                Assign Form Class
              </h3>
              <button
                type="button"
                onClick={() => setAssigningTeacher(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateFormClass} className="space-y-4">
              <p className="text-xs text-slate-400">
                Assign <strong className="text-white">{assigningTeacher.firstName} {assigningTeacher.lastName}</strong> as the official Form Tutor responsible for daily roll-calls and termly remarks.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Select Form Class
                </label>
                <select
                  value={selectedFormClass}
                  onChange={(e) => setSelectedFormClass(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No Form Class (Remove Assignment)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssigningTeacher(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md transition"
                >
                  {submitting ? "Updating..." : "Save Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

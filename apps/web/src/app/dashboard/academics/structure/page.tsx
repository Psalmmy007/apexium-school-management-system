"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BackNavigation } from "@/components/ui/BackNavigation";
import { EmptyState } from "@/components/EmptyState";

interface AcademicSection {
  id: string;
  name: string;
  code?: string;
  displayOrder: number;
  status: string;
}

interface Stream {
  id: string;
  classId: string;
  name: string;
  capacity?: number;
  classTeacherId?: string;
  teacherFirstName?: string;
  teacherLastName?: string;
}

interface ClassItem {
  id: string;
  sectionId?: string;
  name: string;
  code?: string;
  capacity?: number;
  studentCount?: number;
  teacherFirstName?: string;
  teacherLastName?: string;
  streams?: Stream[];
}

export default function AcademicStructurePage() {
  const [sections, setSections] = useState<AcademicSection[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");

  // Form Inputs
  const [sectionName, setSectionName] = useState("");
  const [sectionCode, setSectionCode] = useState("");
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [classSectionId, setClassSectionId] = useState("");
  const [classTeacherId, setClassTeacherId] = useState("");
  const [classCapacity, setClassCapacity] = useState(40);
  const [streamName, setStreamName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/academic-structure");
      const json = await res.json();
      if (json.success) {
        setSections(json.data.sections || []);
        setClasses(json.data.classes || []);
      }
    } catch (err) {
      console.error("Failed loading academic structure", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionName) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/academic-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "section", name: sectionName, code: sectionCode }),
      });
      const json = await res.json();
      if (json.success) {
        setShowSectionModal(false);
        setSectionName("");
        setSectionCode("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/academic-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "class",
          name: className,
          code: classCode,
          sectionId: classSectionId || undefined,
          capacity: Number(classCapacity) || 40,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowClassModal(false);
        setClassName("");
        setClassCode("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !streamName) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/academic-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "stream",
          classId: selectedClassId,
          name: streamName,
          capacity: 20,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowStreamModal(false);
        setStreamName("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Back to Dashboard Navigation */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Academic Structure Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure Sections (Primary, JSS, SSS), Classes, Stream Arms, Class Teachers, and Enrollment Capacities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowSectionModal(true)} className="btn-secondary">
            + New Section
          </button>
          <button onClick={() => setShowClassModal(true)} className="btn-primary">
            + New Class
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 font-medium">Loading academic hierarchy...</div>
      ) : classes.length === 0 ? (
        <EmptyState
          title="No Academic Structure Configured"
          description="Your school does not have any classes or sections configured yet. Create your first class or initialize with our guided School Setup Wizard."
          actionLabel="Open School Setup Wizard"
          actionHref="/dashboard/setup"
        />
      ) : (
        <div className="space-y-8">
          {/* Sections & Classes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div key={cls.id} className="card hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {cls.code || "Class"}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">{cls.name}</h3>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-500">Occupancy</span>
                      <p className="text-sm font-bold text-slate-800">
                        {cls.studentCount || 0} / {cls.capacity || 40}
                      </p>
                    </div>
                  </div>

                  {/* Class Teacher */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Class Teacher:</span>
                    <span className="font-semibold text-slate-800">
                      {cls.teacherFirstName ? `${cls.teacherFirstName} ${cls.teacherLastName}` : "Unassigned"}
                    </span>
                  </div>

                  {/* Stream Arms */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Streams / Arms</span>
                      <button
                        onClick={() => {
                          setSelectedClassId(cls.id);
                          setShowStreamModal(true);
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        + Add Stream
                      </button>
                    </div>

                    {(!cls.streams || cls.streams.length === 0) ? (
                      <p className="text-xs text-slate-400 italic">No stream arms configured for this class.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {cls.streams.map((str) => (
                          <span
                            key={str.id}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700"
                          >
                            {str.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Link href={`/dashboard/students?classId=${cls.id}`} className="btn-ghost btn-sm">
                    View Roster
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: New Section */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create Academic Section</h3>
            <form onSubmit={handleCreateSection} className="space-y-4">
              <div>
                <label className="label">Section Name *</label>
                <input
                  type="text"
                  required
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="e.g. Junior Secondary"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Section Code</label>
                <input
                  type="text"
                  value={sectionCode}
                  onChange={(e) => setSectionCode(e.target.value)}
                  placeholder="e.g. JSS"
                  className="input"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowSectionModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? "Saving..." : "Save Section"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Class */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create New Class</h3>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="label">Class Name *</label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. JSS 1"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Class Code</label>
                <input
                  type="text"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  placeholder="e.g. JSS1"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Academic Section</label>
                <select
                  value={classSectionId}
                  onChange={(e) => setClassSectionId(e.target.value)}
                  className="input"
                >
                  <option value="">Select Section...</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Class Capacity</label>
                <input
                  type="number"
                  value={classCapacity}
                  onChange={(e) => setClassCapacity(Number(e.target.value))}
                  className="input"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowClassModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? "Saving..." : "Save Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Stream Arm */}
      {showStreamModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Stream Arm</h3>
            <form onSubmit={handleCreateStream} className="space-y-4">
              <div>
                <label className="label">Stream Name *</label>
                <input
                  type="text"
                  required
                  value={streamName}
                  onChange={(e) => setStreamName(e.target.value)}
                  placeholder="e.g. Gold Arm or Arm A"
                  className="input"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowStreamModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? "Saving..." : "Save Stream"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

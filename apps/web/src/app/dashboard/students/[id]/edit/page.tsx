"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface ClassItem {
  id: string;
  name: string;
}

interface SectionItem {
  id: string;
  classId: string;
  name: string;
}

export default function EditStudentPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.id as string;

  const [admissionNumber, setAdmissionNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [gender, setGender] = useState("male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [status, setStatus] = useState("active");

  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [sectionList, setSectionList] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [classesRes, studentRes] = await Promise.all([
          fetch("/api/classes"),
          fetch(`/api/students/${studentId}`),
        ]);

        const classesJson = await classesRes.json();
        const studentJson = await studentRes.json();

        if (classesJson.success) {
          setClassList(classesJson.data.classes || []);
          setSectionList(classesJson.data.sections || []);
        }

        if (studentJson.success) {
          const st = studentJson.data;
          setAdmissionNumber(st.admissionNumber || "");
          setFirstName(st.firstName || "");
          setLastName(st.lastName || "");
          setMiddleName(st.middleName || "");
          setGender(st.gender || "male");
          setDateOfBirth(
            st.dateOfBirth
              ? new Date(st.dateOfBirth).toISOString().split("T")[0]
              : ""
          );
          setAddress(st.address || "");
          setClassId(st.classId || "");
          setSectionId(st.sectionId || "");
          setStatus(st.status || "active");
        } else {
          setError(studentJson.error || "Failed to load student details");
        }
      } catch (err: any) {
        setError("Error loading data");
      } finally {
        setLoading(false);
      }
    }

    if (studentId) {
      loadData();
    }
  }, [studentId]);

  const availableSections = sectionList.filter(
    (sec) => sec.classId === classId
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionNumber,
          firstName,
          lastName,
          middleName,
          gender,
          dateOfBirth,
          address,
          classId: classId || null,
          sectionId: sectionId || null,
          status,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Failed to update student");
        setSaving(false);
        return;
      }

      router.push(`/dashboard/students/${studentId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Are you sure you want to delete ${firstName} ${lastName}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (json.success) {
        router.push("/dashboard/students");
        router.refresh();
      } else {
        alert(json.error || "Failed to delete student");
      }
    } catch (err) {
      alert("Error deleting student");
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center text-slate-500">
        Loading student record...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/students/${studentId}`}
          className="btn-ghost btn-sm text-slate-500"
        >
          ← Cancel and Return
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          className="btn-danger btn-sm"
        >
          Delete Student
        </button>
      </div>

      <div className="card">
        <h1 className="text-xl font-bold text-slate-900 mb-1">
          Edit Student Profile
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Update student biodata and class assignment.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Admission Number *</label>
              <input
                type="text"
                required
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="input"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="label">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="graduated">Graduated</option>
                <option value="transferred">Transferred</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Last Name *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Middle Name</label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Residential Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Class Assignment</label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSectionId("");
                }}
                className="input"
              >
                <option value="">Select Class...</option>
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
                value={sectionId}
                disabled={!classId}
                onChange={(e) => setSectionId(e.target.value)}
                className="input"
              >
                <option value="">Select Section...</option>
                {availableSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href={`/dashboard/students/${studentId}`}
              className="btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

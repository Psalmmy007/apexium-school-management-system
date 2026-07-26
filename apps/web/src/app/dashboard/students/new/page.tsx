"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

export default function NewStudentPage() {
  const router = useRouter();

  const [admissionNumber, setAdmissionNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [gender, setGender] = useState("male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [sectionList, setSectionList] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch("/api/classes");
        const json = await res.json();
        if (json.success) {
          setClassList(json.data.classes || []);
          setSectionList(json.data.sections || []);
        }
      } catch (err) {
        console.error("Failed to load classes", err);
      }
    }
    fetchClasses();
  }, []);

  const availableSections = sectionList.filter(
    (sec) => sec.classId === classId
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!admissionNumber || !firstName || !lastName) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
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
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Failed to create student");
        setLoading(false);
        return;
      }

      router.push("/dashboard/students");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/students"
          className="btn-ghost btn-sm text-slate-500"
        >
          ← Back to Students
        </Link>
      </div>

      <div className="card">
        <h1 className="text-xl font-bold text-slate-900 mb-1">
          Register New Student
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Enter student biodata and class assignment details.
        </p>

        {error && (
          <div
            id="student-form-error"
            role="alert"
            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form id="new-student-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="admissionNumber" className="label">
                Admission Number *
              </label>
              <input
                id="admissionNumber"
                type="text"
                required
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                placeholder="e.g. ADM/2026/001"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="gender" className="label">
                Gender
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="input"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="firstName" className="label">
                First Name *
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. John"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="label">
                Last Name *
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Doe"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="middleName" className="label">
                Middle Name
              </label>
              <input
                id="middleName"
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="e.g. Paul"
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dateOfBirth" className="label">
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="address" className="label">
                Residential Address
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address..."
                className="input"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="classId" className="label">
                Class Assignment
              </label>
              <select
                id="classId"
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
              <label htmlFor="sectionId" className="label">
                Section / Arm
              </label>
              <select
                id="sectionId"
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
            <Link href="/dashboard/students" className="btn-secondary">
              Cancel
            </Link>
            <button
              id="submit-student-btn"
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? "Saving Student..." : "Save Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

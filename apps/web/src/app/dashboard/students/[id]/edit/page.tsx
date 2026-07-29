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
  const [passportUrl, setPassportUrl] = useState("");
  const [passportPreview, setPassportPreview] = useState("");
  const [uploadingPassport, setUploadingPassport] = useState(false);

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
          setPassportUrl(st.passportUrl || st.photoUrl || "");
          setPassportPreview(st.passportUrl || st.photoUrl || "");
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

  const handlePassportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPEG/PNG/WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image file size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPassportPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);

    setUploadingPassport(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/passport", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setPassportUrl(json.url);
        setPassportPreview(json.url);
      } else {
        setError(json.error || "Failed uploading passport image.");
      }
    } catch (err: any) {
      setError(err.message || "Error uploading passport photo.");
    } finally {
      setUploadingPassport(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionNumber,
          firstName,
          lastName,
          middleName,
          gender,
          dateOfBirth,
          address,
          passportUrl,
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
          {/* Passport Photo Upload & Preview */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-32 h-40 rounded-2xl bg-slate-100 border-2 border-indigo-100 flex flex-col items-center justify-center overflow-hidden relative shadow-sm flex-shrink-0">
              {passportPreview || passportUrl ? (
                <img
                  src={passportPreview || passportUrl}
                  alt="Student Passport"
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="text-center p-3 text-slate-400 text-xs flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-200/60 flex items-center justify-center mb-1 text-slate-400">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <span className="font-semibold text-[11px]">No Photo</span>
                </div>
              )}
            </div>

            <div className="space-y-3 flex-1 text-center sm:text-left">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Update Student Passport Photograph</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload a clear front-facing portrait photo of the student (JPEG or PNG, max 5MB).
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <label className="btn-secondary btn-sm cursor-pointer flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span>{uploadingPassport ? "Uploading Image..." : "Choose Passport Image"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePassportUpload}
                    disabled={uploadingPassport}
                    className="hidden"
                  />
                </label>

                {(passportPreview || passportUrl) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPassportUrl("");
                      setPassportPreview("");
                    }}
                    className="text-xs text-red-600 font-semibold hover:underline"
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              {passportUrl && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span>Passport photo verified & attached</span>
                </div>
              )}
            </div>
          </div>
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

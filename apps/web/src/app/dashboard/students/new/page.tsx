"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

interface ClassItem {
  id: string;
  name: string;
}

interface SectionItem {
  id: string;
  classId: string;
  name: string;
}

interface GuardianItem {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  relationship?: string;
}

export default function NewStudentPage() {
  const router = useRouter();

  // Wizard Step (1 to 5)
  const [step, setStep] = useState(1);

  // Step 1: Personal & Passport
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split("T")[0]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [gender, setGender] = useState("male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [passportUrl, setPassportUrl] = useState("");
  const [uploadingPassport, setUploadingPassport] = useState(false);

  // Step 2: Demographics & Health
  const [stateOfOrigin, setStateOfOrigin] = useState("");
  const [lga, setLga] = useState("");
  const [nationality, setNationality] = useState("Nigerian");
  const [religion, setReligion] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [genotype, setGenotype] = useState("");
  const [address, setAddress] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [previousSchool, setPreviousSchool] = useState("");

  // Step 3: Academic & Class Assignment
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [sectionList, setSectionList] = useState<SectionItem[]>([]);

  // Step 4: Reusable Guardians
  const [guardianSearch, setGuardianSearch] = useState("");
  const [guardianSearchResults, setGuardianSearchResults] = useState<GuardianItem[]>([]);
  const [selectedGuardianId, setSelectedGuardianId] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("Father");
  const [newGuardianFirstName, setNewGuardianFirstName] = useState("");
  const [newGuardianLastName, setNewGuardianLastName] = useState("");
  const [newGuardianPhone, setNewGuardianPhone] = useState("");
  const [newGuardianEmail, setNewGuardianEmail] = useState("");
  const [showNewGuardianForm, setShowNewGuardianForm] = useState(false);

  // Step 5: Emergency & Review
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

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

  const availableSections = sectionList.filter((sec) => sec.classId === classId);

  // Search reusable guardians
  const handleSearchGuardians = async (q: string) => {
    setGuardianSearch(q);
    if (!q || q.length < 2) {
      setGuardianSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/guardians?query=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (json.success) {
        setGuardianSearchResults(json.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create new reusable guardian
  const handleCreateGuardian = async () => {
    if (!newGuardianFirstName || !newGuardianLastName || !newGuardianPhone) return;
    try {
      const res = await fetch("/api/guardians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: newGuardianFirstName,
          lastName: newGuardianLastName,
          phone: newGuardianPhone,
          email: newGuardianEmail,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSelectedGuardianId(json.data.id);
        setShowNewGuardianForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [passportPreview, setPassportPreview] = useState("");

  // Handle Passport Photo Upload (stores clean Data URL path)
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

    // Instant local browser preview
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

  // Final Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!admissionNumber || !firstName || !lastName) {
      setError("Admission number, first name, and last name are required.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionNumber,
          admissionDate,
          firstName,
          lastName,
          middleName,
          gender,
          dateOfBirth,
          passportUrl,
          photoUrl: passportUrl,
          stateOfOrigin,
          lga,
          nationality,
          religion,
          bloodGroup,
          genotype,
          address,
          medicalConditions,
          allergies,
          previousSchool,
          classId: classId || null,
          sectionId: sectionId || null,
          emergencyContactName,
          emergencyContactPhone,
          guardianId: selectedGuardianId || null,
          guardianRelationship,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Failed to register student");
        setLoading(false);
        return;
      }

      router.push("/dashboard/students");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      {/* Back Link */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/students" className="btn-ghost btn-sm text-slate-500">
          ← Back to Students Roster
        </Link>
      </div>

      {/* Stepper Header */}
      <div className="card">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Student Admission Wizard</h1>
        <p className="text-sm text-slate-500 mb-6">
          Complete multi-step student admission workflow with passport upload, academic assignment, and guardian association.
        </p>

        {/* 5-Step Stepper Bar */}
        <div className="grid grid-cols-5 gap-2 border-b border-slate-200 pb-6 mb-6">
          {[
            { stepNum: 1, title: "Biodata & Passport" },
            { stepNum: 2, title: "Demographics" },
            { stepNum: 3, title: "Class Assignment" },
            { stepNum: 4, title: "Guardians" },
            { stepNum: 5, title: "Review & Save" },
          ].map((s) => (
            <button
              type="button"
              key={s.stepNum}
              onClick={() => setStep(s.stepNum)}
              className={`flex flex-col items-center p-2 rounded-xl text-xs font-bold transition ${
                step === s.stepNum
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : step > s.stepNum
                  ? "bg-slate-50 text-emerald-700"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 text-[11px] ${step === s.stepNum ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                {s.stepNum}
              </span>
              <span className="truncate max-w-full">{s.title}</span>
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: Personal Details & Passport */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                Step 1: Student Biodata & Passport Photo
              </h2>

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
                    <h3 className="text-sm font-bold text-slate-900">Student Passport Photograph</h3>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="admissionNumber" className="label">Admission Number *</label>
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
                  <label htmlFor="admissionDate" className="label">Admission Date</label>
                  <input
                    id="admissionDate"
                    type="date"
                    value={admissionDate}
                    onChange={(e) => setAdmissionDate(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="firstName" className="label">First Name *</label>
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
                  <label htmlFor="lastName" className="label">Last Name *</label>
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
                  <label htmlFor="middleName" className="label">Middle Name</label>
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
                  <label htmlFor="gender" className="label">Gender</label>
                  <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} className="input">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="dateOfBirth" className="label">Date of Birth</label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="button" onClick={() => setStep(2)} className="btn-primary">
                  Next: Demographics →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Demographics & Health */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                Step 2: Demographics & Medical History
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">State of Origin</label>
                  <input
                    type="text"
                    value={stateOfOrigin}
                    onChange={(e) => setStateOfOrigin(e.target.value)}
                    placeholder="e.g. Lagos"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Local Government (LGA)</label>
                  <input
                    type="text"
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                    placeholder="e.g. Ikeja"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Nationality</label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    placeholder="e.g. Nigerian"
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Religion</label>
                  <input
                    type="text"
                    value={religion}
                    onChange={(e) => setReligion(e.target.value)}
                    placeholder="e.g. Christianity / Islam"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Blood Group</label>
                  <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className="input">
                    <option value="">Select Blood Group...</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div>
                  <label className="label">Genotype</label>
                  <select value={genotype} onChange={(e) => setGenotype(e.target.value)} className="input">
                    <option value="">Select Genotype...</option>
                    <option value="AA">AA</option>
                    <option value="AS">AS</option>
                    <option value="SS">SS</option>
                    <option value="AC">AC</option>
                    <option value="SC">SC</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Residential Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full street address..."
                  className="input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Medical Conditions</label>
                  <textarea
                    value={medicalConditions}
                    onChange={(e) => setMedicalConditions(e.target.value)}
                    placeholder="e.g. Asthma, Diabetes (or None)"
                    rows={2}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Allergies</label>
                  <textarea
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g. Peanuts, Penicillin (or None)"
                    rows={2}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                  ← Back
                </button>
                <button type="button" onClick={() => setStep(3)} className="btn-primary">
                  Next: Academic Assignment →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Academic Class & Arm Assignment */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                Step 3: Class & Stream Arm Assignment
              </h2>

              {classList.length === 0 ? (
                <EmptyState
                  title="No Academic Classes Found"
                  description="Classes must exist before students can be assigned. Create your school classes in Academic Structure."
                  actionLabel="Create Class in Academic Structure"
                  actionHref="/dashboard/academics/structure"
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="classId" className="label">Class Assignment *</label>
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
                    <label htmlFor="sectionId" className="label">Stream / Arm</label>
                    <select
                      id="sectionId"
                      value={sectionId}
                      disabled={!classId}
                      onChange={(e) => setSectionId(e.target.value)}
                      className="input"
                    >
                      <option value="">Select Stream...</option>
                      {availableSections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setStep(2)} className="btn-secondary">
                  ← Back
                </button>
                <button type="button" onClick={() => setStep(4)} className="btn-primary">
                  Next: Guardians →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Reusable Guardians */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                Step 4: Reusable Guardian Link
              </h2>

              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-xs text-indigo-900 space-y-1">
                <p className="font-bold">Reusable Guardian Entity Architecture:</p>
                <p>Search existing parent/guardian records or register a new guardian once. A single guardian can be linked to multiple children.</p>
              </div>

              {!showNewGuardianForm ? (
                <div className="space-y-4">
                  <div>
                    <label className="label">Search Existing Guardian by Phone / Name</label>
                    <input
                      type="text"
                      value={guardianSearch}
                      onChange={(e) => handleSearchGuardians(e.target.value)}
                      placeholder="Type parent phone number or name..."
                      className="input"
                    />
                  </div>

                  {guardianSearchResults.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-700">Select Guardian:</p>
                      {guardianSearchResults.map((g) => (
                        <div
                          key={g.id}
                          onClick={() => setSelectedGuardianId(g.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                            selectedGuardianId === g.id
                              ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div>
                            <p className="font-bold text-sm text-slate-900">{g.firstName} {g.lastName}</p>
                            <p className="text-xs text-slate-500">Phone: {g.phone} {g.email ? `• ${g.email}` : ""}</p>
                          </div>
                          {selectedGuardianId === g.id && (
                            <span className="badge-primary">Selected</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNewGuardianForm(true)}
                      className="btn-secondary text-xs"
                    >
                      + Register New Guardian Record
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">New Guardian Record</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">First Name *</label>
                      <input
                        type="text"
                        value={newGuardianFirstName}
                        onChange={(e) => setNewGuardianFirstName(e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Last Name *</label>
                      <input
                        type="text"
                        value={newGuardianLastName}
                        onChange={(e) => setNewGuardianLastName(e.target.value)}
                        className="input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Phone Number *</label>
                      <input
                        type="text"
                        value={newGuardianPhone}
                        onChange={(e) => setNewGuardianPhone(e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Email Address</label>
                      <input
                        type="email"
                        value={newGuardianEmail}
                        onChange={(e) => setNewGuardianEmail(e.target.value)}
                        className="input"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowNewGuardianForm(false)} className="btn-ghost btn-sm">
                      Cancel
                    </button>
                    <button type="button" onClick={handleCreateGuardian} className="btn-primary btn-sm">
                      Save Guardian
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="label">Relationship to Student</label>
                <select
                  value={guardianRelationship}
                  onChange={(e) => setGuardianRelationship(e.target.value)}
                  className="input max-w-xs"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Legal Guardian">Legal Guardian</option>
                  <option value="Sponsor">Sponsor</option>
                </select>
              </div>

              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setStep(3)} className="btn-secondary">
                  ← Back
                </button>
                <button type="button" onClick={() => setStep(5)} className="btn-primary">
                  Next: Review & Save →
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Emergency Contact & Final Review */}
          {step === 5 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                Step 5: Emergency Contacts & Final Review
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="e.g. Dr. Paul Smith"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Emergency Contact Phone</label>
                  <input
                    type="text"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="+2348000000000"
                    className="input"
                  />
                </div>
              </div>

              {/* Review Summary Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Admission Review Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Admission No:</span>
                    <p className="font-bold text-slate-900">{admissionNumber}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Full Name:</span>
                    <p className="font-bold text-slate-900">{lastName}, {firstName} {middleName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Gender & DOB:</span>
                    <p className="font-bold text-slate-900 capitalize">{gender} ({dateOfBirth || "N/A"})</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Passport:</span>
                    <p className="font-bold text-slate-900">{passportUrl ? "Uploaded ✓" : "Not Provided"}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setStep(4)} className="btn-secondary">
                  ← Back
                </button>
                <button
                  id="submit-student-btn"
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? "Finalizing Admission..." : "Finalize & Register Student"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

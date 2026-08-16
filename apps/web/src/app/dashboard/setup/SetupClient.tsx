"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TermFormItem {
  name: string;
  start: string;
  end: string;
  isCurrent: boolean;
}

interface SubjectFormItem {
  name: string;
  code: string;
}

interface GradeBandItem {
  grade: string;
  minScore: number;
  maxScore: number;
  remark: string;
}

interface Props {
  initialStatus: {
    status: string;
    isCompleted: boolean;
    hasSession: boolean;
    hasClass: boolean;
    hasStudents?: boolean;
  };
  initialSchool?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    motto?: string;
  } | null;
  currentUser?: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
}

const DEFAULT_TERMS: TermFormItem[] = [
  { name: "First Term", start: "2025-09-01", end: "2025-12-15", isCurrent: true },
  { name: "Second Term", start: "2026-01-10", end: "2026-04-10", isCurrent: false },
  { name: "Third Term", start: "2026-04-25", end: "2026-07-25", isCurrent: false },
];

const DEFAULT_CLASSES = ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"];
const DEFAULT_DEPTS = ["Sciences", "Arts & Humanities", "Commercial"];

const DEFAULT_SUBJECTS: SubjectFormItem[] = [
  { name: "Mathematics", code: "MTH" },
  { name: "English Language", code: "ENG" },
  { name: "Basic Science", code: "BSC" },
  { name: "Physics", code: "PHY" },
  { name: "Chemistry", code: "CHM" },
  { name: "Biology", code: "BIO" },
  { name: "Economics", code: "ECO" },
  { name: "Civic Education", code: "CIV" },
];

const DEFAULT_WAEC_BANDS: GradeBandItem[] = [
  { grade: "A1", minScore: 75, maxScore: 100, remark: "Excellent" },
  { grade: "B2", minScore: 70, maxScore: 74.99, remark: "Very Good" },
  { grade: "B3", minScore: 65, maxScore: 69.99, remark: "Good" },
  { grade: "C4", minScore: 60, maxScore: 64.99, remark: "Credit" },
  { grade: "C5", minScore: 55, maxScore: 59.99, remark: "Credit" },
  { grade: "C6", minScore: 50, maxScore: 54.99, remark: "Credit" },
  { grade: "D7", minScore: 45, maxScore: 49.99, remark: "Pass" },
  { grade: "E8", minScore: 40, maxScore: 44.99, remark: "Pass" },
  { grade: "F9", minScore: 0, maxScore: 39.99, remark: "Fail" },
];

export function SetupClient({ initialStatus, initialSchool, currentUser }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 2: School Profile Form State
  const [schoolName, setSchoolName] = useState(initialSchool?.name || "Apexium Academy");
  const [schoolEmail, setSchoolEmail] = useState(initialSchool?.email || currentUser?.email || "admin@apexium.edu");
  const [schoolPhone, setSchoolPhone] = useState(initialSchool?.phone || "+2348000000000");
  const [campusAddress, setCampusAddress] = useState(initialSchool?.address || "Main Campus, Lagos");
  const [schoolMotto, setSchoolMotto] = useState(initialSchool?.motto || "Excellence & Character");

  // Primary Admin Details
  const [adminFirstName, setAdminFirstName] = useState(currentUser?.firstName || "School");
  const [adminLastName, setAdminLastName] = useState(currentUser?.lastName || "Administrator");
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || "admin@apexium.edu");

  // Step 3: Academic Session & Terms
  const [sessionName, setSessionName] = useState("2025/2026");
  const [termsList, setTermsList] = useState<TermFormItem[]>(DEFAULT_TERMS);

  // Step 4: Classes, Departments & Subjects
  const [classesList, setClassesList] = useState<string[]>(DEFAULT_CLASSES);
  const [newClassName, setNewClassName] = useState("");

  const [deptsList, setDeptsList] = useState<string[]>(DEFAULT_DEPTS);
  const [newDeptName, setNewDeptName] = useState("");

  const [subjectsList, setSubjectsList] = useState<SubjectFormItem[]>(DEFAULT_SUBJECTS);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");

  // Step 5: Grading Scale
  const [gradeBands, setGradeBands] = useState<GradeBandItem[]>(DEFAULT_WAEC_BANDS);

  // Execution State
  const [savingSchool, setSavingSchool] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(initialStatus.isCompleted);
  const [schoolSaved, setSchoolSaved] = useState(!!initialSchool?.name);
  const [errorMsg, setErrorMsg] = useState("");

  // Step 2 Action: Save School Profile & Provision School/Admin
  const handleSaveSchoolProfile = async () => {
    if (!schoolName.trim()) {
      setErrorMsg("School Name is required.");
      return;
    }

    setSavingSchool(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/setup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName,
          adminEmail,
          adminFirstName,
          adminLastName,
          motto: schoolMotto,
          phone: schoolPhone,
          address: campusAddress,
        }),
      });

      let json = await res.json();

      if (!res.ok || !json.success) {
        // Fallback to /api/setup if session exists
        const res2 = await fetch("/api/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolName,
            address: campusAddress,
            phone: schoolPhone,
            sessionName,
          }),
        });
        const json2 = await res2.json();
        if (!res2.ok || !json2.success) {
          throw new Error(json2.error || json.error || "Failed provisioning school entity");
        }
        json = json2;
      }

      setSchoolSaved(true);
      setStep(3);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed saving school profile.");
    } finally {
      setSavingSchool(false);
    }
  };

  // Step 3 Actions: Terms
  const handleTermChange = (index: number, field: keyof TermFormItem, val: any) => {
    setTermsList((prev) =>
      prev.map((t, i) => {
        if (field === "isCurrent") {
          return { ...t, isCurrent: i === index };
        }
        return i === index ? { ...t, [field]: val } : t;
      })
    );
  };

  // Step 4 Actions: Classes, Departments, Subjects
  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    if (classesList.includes(newClassName.trim())) return;
    setClassesList((prev) => [...prev, newClassName.trim()]);
    setNewClassName("");
  };

  const handleRemoveClass = (index: number) => {
    setClassesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddDept = () => {
    if (!newDeptName.trim()) return;
    if (deptsList.includes(newDeptName.trim())) return;
    setDeptsList((prev) => [...prev, newDeptName.trim()]);
    setNewDeptName("");
  };

  const handleRemoveDept = (index: number) => {
    setDeptsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    const code = newSubjectCode.trim() || newSubjectName.trim().substring(0, 3).toUpperCase();
    setSubjectsList((prev) => [...prev, { name: newSubjectName.trim(), code }]);
    setNewSubjectName("");
    setNewSubjectCode("");
  };

  const handleRemoveSubject = (index: number) => {
    setSubjectsList((prev) => prev.filter((_, i) => i !== index));
  };

  // Step 5 Actions: Grading Scale
  const handleGradeBandChange = (index: number, field: keyof GradeBandItem, val: any) => {
    setGradeBands((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: val } : b))
    );
  };

  const handleResetGradingToDefault = () => {
    setGradeBands(DEFAULT_WAEC_BANDS);
  };

  // Step 6 Action: Execute Core Setup
  const handleExecuteCoreSetup = async () => {
    setExecuting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/setup/wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionName,
          terms: termsList,
          classNames: classesList,
          departmentNames: deptsList,
          subjects: subjectsList,
          gradeBands,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Setup execution failed");
      }

      setIsCompleted(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Setup execution failed. Please check form inputs.");
    } finally {
      setExecuting(false);
    }
  };

  const stepLabels = [
    "1. Welcome",
    "2. School Profile",
    "3. Session & Terms",
    "4. Classes & Subjects",
    "5. Grading Scale",
    "6. Activation",
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Wizard Step Progress Tracker */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Apexium School ERP Core Setup Wizard
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
            Step {step} of 6
          </span>
        </div>

        <div className="flex items-center justify-between text-xs font-semibold overflow-x-auto pb-2 border-b border-slate-800">
          {stepLabels.map((label, idx) => (
            <span
              key={idx}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                step === idx + 1
                  ? "bg-indigo-600 text-white font-bold"
                  : step > idx + 1
                  ? "text-emerald-400 font-bold"
                  : "text-slate-500"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs rounded-xl flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-700">
            ✕
          </button>
        </div>
      )}

      {/* STEP 1: WELCOME */}
      {step === 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 text-xs text-slate-300">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Welcome to Apexium School Core Setup</h2>
            <p className="text-slate-400 mt-1 leading-relaxed text-sm">
              This simplified setup wizard establishes the foundational structure required for your school: institution identity, academic terms, classes, departments, subjects, and grading scale.
            </p>
          </div>

          <div className="p-4 bg-indigo-950/40 border border-indigo-800/40 rounded-xl space-y-3">
            <strong className="text-sm font-bold text-indigo-300 block">Core Setup Foundation:</strong>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li><strong>Institution Profile:</strong> Official name, address, contact information, and primary admin account.</li>
              <li><strong>Academic Calendar:</strong> Active academic session and 3 customizable term date ranges.</li>
              <li><strong>Academic Structure:</strong> Fully customizable classes, departments, and subjects.</li>
              <li><strong>Grading Scale:</strong> Configurable WAEC-style grade bands (A1–F9) with custom score thresholds.</li>
              <li><strong>Module Activation:</strong> Instant activation of all 12 core ERP modules upon completion.</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 text-xs">
            <strong className="text-slate-200 block mb-1">Looking to add students, teachers, or parent links?</strong>
            People management (students, teaching staff, guardians) happens on dedicated, fully featured portal pages after setup is complete.
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="button"
              id="btn-begin-setup"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-sm text-sm"
            >
              Begin School Setup →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CREATE & CONFIGURE SCHOOL PROFILE */}
      {step === 2 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 text-xs text-slate-300">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">School Profile & Admin Account</h2>
            <p className="text-slate-400 mt-1">
              Enter your institution details and administrator credentials to configure your school tenant.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-400">
                Institution Profile
              </h3>
              <div>
                <label htmlFor="input-school-name" className="block text-slate-300 font-semibold mb-1">
                  School Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="input-school-name"
                  required
                  placeholder="e.g. St. Jude International Academy"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="input-school-email" className="block text-slate-300 font-semibold mb-1">Official School Email</label>
                <input
                  type="email"
                  id="input-school-email"
                  placeholder="info@yourschool.edu.ng"
                  value={schoolEmail}
                  onChange={(e) => setSchoolEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="input-school-phone" className="block text-slate-300 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  id="input-school-phone"
                  placeholder="+234 800 000 0000"
                  value={schoolPhone}
                  onChange={(e) => setSchoolPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="input-campus-address" className="block text-slate-300 font-semibold mb-1">Campus Address</label>
                <input
                  type="text"
                  id="input-campus-address"
                  placeholder="e.g. 123 School Way, Victoria Island, Lagos"
                  value={campusAddress}
                  onChange={(e) => setCampusAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="input-school-motto" className="block text-slate-300 font-semibold mb-1">School Motto</label>
                <input
                  type="text"
                  id="input-school-motto"
                  placeholder="e.g. Excellence & Character"
                  value={schoolMotto}
                  onChange={(e) => setSchoolMotto(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-800 md:pl-6 pt-4 md:pt-0">
              <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-400">
                Primary Administrator
              </h3>
              <div>
                <label htmlFor="input-admin-first-name" className="block text-slate-300 font-semibold mb-1">First Name</label>
                <input
                  type="text"
                  id="input-admin-first-name"
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="input-admin-last-name" className="block text-slate-300 font-semibold mb-1">Last Name</label>
                <input
                  type="text"
                  id="input-admin-last-name"
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="input-admin-email" className="block text-slate-300 font-semibold mb-1">Administrator Email</label>
                <input
                  type="email"
                  id="input-admin-email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-400">
                <span className="font-bold block text-slate-200 mb-1">Provisioning Status:</span>
                {schoolSaved ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
                    ✓ School Account Active ({schoolName})
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300">
                    Ready to provision
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-between border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition font-medium"
            >
              Back
            </button>
            <button
              type="button"
              id="btn-save-school-profile"
              disabled={savingSchool}
              onClick={handleSaveSchoolProfile}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-50 text-sm"
            >
              {savingSchool ? "Saving..." : "Save & Continue: Academic Session →"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ACADEMIC SESSION & TERMS */}
      {step === 3 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 text-xs text-slate-300">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Academic Session & Terms</h2>
            <p className="text-slate-400 mt-1">
              Select your academic year session and configure real start/end dates for each term.
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Academic Session</label>
            <select
              id="select-session-name"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-full md:w-64 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
              <option value="2027/2028">2027/2028</option>
              <option value="2028/2029">2028/2029</option>
            </select>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-400">
              Term Schedule Configuration
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {termsList.map((t, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    t.isCurrent
                      ? "bg-indigo-950/30 border-indigo-700/60"
                      : "bg-slate-950 border-slate-800"
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Term Name</label>
                      <input
                        type="text"
                        value={t.name}
                        onChange={(e) => handleTermChange(idx, "name", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Start Date</label>
                      <input
                        type="date"
                        value={t.start}
                        onChange={(e) => handleTermChange(idx, "start", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-medium mb-1">End Date</label>
                      <input
                        type="date"
                        value={t.end}
                        onChange={(e) => handleTermChange(idx, "end", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center sm:justify-center pt-2 sm:pt-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="currentTermRadio"
                          checked={t.isCurrent}
                          onChange={() => handleTermChange(idx, "isCurrent", true)}
                          className="text-indigo-600 focus:ring-indigo-500 h-4 w-4 bg-slate-900 border-slate-700"
                        />
                        <span className="text-xs font-semibold text-slate-200">Active Term</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-between border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition font-medium"
            >
              Back
            </button>
            <button
              type="button"
              id="btn-next-classes-subjects"
              onClick={() => setStep(4)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-sm text-sm"
            >
              Next: Classes, Depts & Subjects →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: CLASSES, DEPARTMENTS & SUBJECTS */}
      {step === 4 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-xs text-slate-300">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Classes, Departments & Subjects</h2>
            <p className="text-slate-400 mt-1">
              Add, remove, or customize the active classes, departments, and academic subjects for your institution.
            </p>
          </div>

          {/* 1. Classes Section */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-400">
                Active Classes ({classesList.length})
              </h3>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                id="input-new-class-name"
                placeholder="e.g. Primary 1, Nursery 2, Year 7"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddClass())}
                className="flex-1 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                id="btn-add-class"
                onClick={handleAddClass}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition"
              >
                + Add Class
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {classesList.map((cls, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs"
                >
                  {cls}
                  <button
                    type="button"
                    onClick={() => handleRemoveClass(idx)}
                    className="text-slate-400 hover:text-rose-400 font-bold ml-1"
                    title={`Remove ${cls}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {classesList.length === 0 && (
                <p className="text-amber-400 text-xs italic">At least one class is recommended.</p>
              )}
            </div>
          </div>

          {/* 2. Departments Section */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-400">
                Academic Departments ({deptsList.length})
              </h3>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                id="input-new-dept-name"
                placeholder="e.g. Vocational, Languages"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddDept())}
                className="flex-1 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                id="btn-add-dept"
                onClick={handleAddDept}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
              >
                + Add Department
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {deptsList.map((dept, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs"
                >
                  {dept}
                  <button
                    type="button"
                    onClick={() => handleRemoveDept(idx)}
                    className="text-slate-400 hover:text-rose-400 font-bold ml-1"
                    title={`Remove ${dept}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 3. Subjects Section */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-400">
                Academic Subjects ({subjectsList.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                id="input-new-subject-name"
                placeholder="Subject Name (e.g. Further Math)"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="sm:col-span-2 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  id="input-new-subject-code"
                  placeholder="Code (FMT)"
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value)}
                  className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  id="btn-add-subject"
                  onClick={handleAddSubject}
                  className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition text-xs whitespace-nowrap"
                >
                  + Add Subject
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {subjectsList.map((sub, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs"
                >
                  <span>{sub.name}</span>
                  <span className="text-[10px] text-indigo-400 font-mono">({sub.code})</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubject(idx)}
                    className="text-slate-400 hover:text-rose-400 font-bold ml-1"
                    title={`Remove ${sub.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-between border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition font-medium"
            >
              Back
            </button>
            <button
              type="button"
              id="btn-next-grading-scale"
              onClick={() => setStep(5)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-sm text-sm"
            >
              Next: Grading Scale →
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: GRADING SCALE */}
      {step === 5 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Grading Scale Scheme</h2>
              <p className="text-slate-400 mt-1">
                Configure grade bands, minimum score cutoffs, and remarks used for scores and report cards.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetGradingToDefault}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 font-medium"
            >
              Reset to WAEC Standard
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Grade</th>
                  <th className="py-2.5 px-3">Min Score (%)</th>
                  <th className="py-2.5 px-3">Max Score (%)</th>
                  <th className="py-2.5 px-3">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {gradeBands.map((band, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 px-3 font-bold text-white text-sm">{band.grade}</td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.1"
                        value={band.minScore}
                        onChange={(e) =>
                          handleGradeBandChange(idx, "minScore", parseFloat(e.target.value) || 0)
                        }
                        className="w-24 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.1"
                        value={band.maxScore}
                        onChange={(e) =>
                          handleGradeBandChange(idx, "maxScore", parseFloat(e.target.value) || 0)
                        }
                        className="w-24 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={band.remark}
                        onChange={(e) => handleGradeBandChange(idx, "remark", e.target.value)}
                        className="w-full max-w-xs px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 flex justify-between border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition font-medium"
            >
              Back
            </button>
            <button
              type="button"
              id="btn-next-activation"
              onClick={() => setStep(6)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-sm text-sm"
            >
              Next: Review & Activation →
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: REVIEW & ACTIVATION */}
      {step === 6 && !isCompleted && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-xs text-slate-300">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Review & Execute Setup</h2>
            <p className="text-slate-400 mt-1">
              Verify your setup details before creating core structure records and activating all ERP modules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h3 className="font-bold text-indigo-400 text-xs uppercase tracking-wider">Institution Profile</h3>
              <p><strong className="text-white">Name:</strong> {schoolName}</p>
              <p><strong className="text-white">Email:</strong> {schoolEmail}</p>
              <p><strong className="text-white">Phone:</strong> {schoolPhone}</p>
              <p><strong className="text-white">Address:</strong> {campusAddress}</p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h3 className="font-bold text-indigo-400 text-xs uppercase tracking-wider">Academic Calendar</h3>
              <p><strong className="text-white">Session:</strong> {sessionName}</p>
              <p><strong className="text-white">Configured Terms:</strong> {termsList.length} terms</p>
              <p><strong className="text-white">Current Active Term:</strong> {termsList.find((t) => t.isCurrent)?.name || "First Term"}</p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h3 className="font-bold text-emerald-400 text-xs uppercase tracking-wider">Academic Structure</h3>
              <p><strong className="text-white">Classes ({classesList.length}):</strong> {classesList.join(", ")}</p>
              <p><strong className="text-white">Departments ({deptsList.length}):</strong> {deptsList.join(", ")}</p>
              <p><strong className="text-white">Subjects ({subjectsList.length}):</strong> {subjectsList.map((s) => s.name).join(", ")}</p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h3 className="font-bold text-emerald-400 text-xs uppercase tracking-wider">Grading Scheme</h3>
              <p><strong className="text-white">Scale:</strong> WAEC Standard Scheme ({gradeBands.length} Grade Bands)</p>
              <p><strong className="text-white">Top Grade:</strong> {gradeBands[0]?.grade} ({gradeBands[0]?.minScore}% - {gradeBands[0]?.maxScore}%)</p>
            </div>
          </div>

          <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-emerald-300">
            <strong className="block text-sm font-bold mb-1">What happens on execution:</strong>
            <p className="text-xs text-slate-300">
              The system will write real terms, classes, departments, subjects, and grading bands to the database, mark onboarding as completed, and unlock all 12 ERP management modules for your school.
            </p>
          </div>

          <div className="pt-4 flex justify-between border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(5)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition font-medium"
            >
              Back
            </button>
            <button
              type="button"
              id="btn-execute-setup"
              disabled={executing}
              onClick={handleExecuteCoreSetup}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition text-sm disabled:opacity-50"
            >
              {executing ? "Activating Core ERP Modules..." : "Execute Core Setup & Activate ERP 🚀"}
            </button>
          </div>
        </div>
      )}

      {/* COMPLETION SUCCESS SCREEN */}
      {(isCompleted || (step === 6 && isCompleted)) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-400 flex items-center justify-center text-3xl mx-auto font-bold">
            ✓
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white">School Core Setup Complete!</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">
              <span className="text-white font-semibold">{schoolName}</span> is now fully provisioned with academic sessions, classes, subjects, and grading scale. All 12 ERP modules are unlocked.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto text-left pt-2">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase text-slate-500 font-bold block">Classes</span>
              <span className="text-base font-bold text-white">{classesList.length} Active</span>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase text-slate-500 font-bold block">Subjects</span>
              <span className="text-base font-bold text-white">{subjectsList.length} Active</span>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase text-slate-500 font-bold block">Terms</span>
              <span className="text-base font-bold text-white">{termsList.length} Terms</span>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase text-slate-500 font-bold block">Grading</span>
              <span className="text-base font-bold text-white">{gradeBands.length} Bands</span>
            </div>
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <button
              type="button"
              id="btn-go-to-dashboard"
              onClick={() => router.push("/dashboard")}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition shadow-sm"
            >
              Go to Executive Dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export function SetupClient({ initialStatus, initialSchool, currentUser }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // School Profile Form State
  const [schoolName, setSchoolName] = useState(initialSchool?.name || "Apexium Academy");
  const [schoolEmail, setSchoolEmail] = useState(initialSchool?.email || currentUser?.email || "admin@apexium.edu");
  const [schoolPhone, setSchoolPhone] = useState(initialSchool?.phone || "+2348000000000");
  const [campusAddress, setCampusAddress] = useState(initialSchool?.address || "Main Campus, Lagos");
  const [schoolMotto, setSchoolMotto] = useState(initialSchool?.motto || "Excellence & Character");

  // Admin User Details
  const [adminFirstName, setAdminFirstName] = useState(currentUser?.firstName || "School");
  const [adminLastName, setAdminLastName] = useState(currentUser?.lastName || "Administrator");
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || "admin@apexium.edu");

  // Academic Structure State
  const [sessionName, setSessionName] = useState("2025/2026");
  const [selectedClasses, setSelectedClasses] = useState(["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"]);
  const [selectedDepts, setSelectedDepts] = useState(["Sciences", "Arts & Humanities", "Commercial"]);

  // Staff & Students Initial Configuration
  const [teacherName1, setTeacherName1] = useState("Grace Okonkwo");
  const [teacherName2, setTeacherName2] = useState("David Adeyemi");
  const [studentName1, setStudentName1] = useState("Emmanuel Bello");
  const [studentName2, setStudentName2] = useState("Chiamaka Eze");

  const [savingSchool, setSavingSchool] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(initialStatus.isCompleted);
  const [schoolSaved, setSchoolSaved] = useState(!!initialSchool?.name);
  const [errorMsg, setErrorMsg] = useState("");

  // 1. Provision / Save School Profile
  const handleSaveSchoolProfile = async () => {
    if (!schoolName.trim()) {
      setErrorMsg("School Name is required to provision the institution.");
      return;
    }

    setSavingSchool(true);
    setErrorMsg("");

    try {
      // First attempt using /api/setup/start
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

      // Fallback to /api/setup if /api/setup/start requires session
      if (!res.ok || !json.success) {
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

  // 2. Run Full Wizard Activation
  const handleRunSetupWizard = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res1 = await fetch("/api/setup/wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionName,
          classNames: selectedClasses,
          departmentNames: selectedDepts,
          teachers: [
            { firstName: teacherName1.split(" ")[0] || "Grace", lastName: teacherName1.split(" ")[1] || "Staff", email: `teacher1.${Date.now()}@school.edu.ng` },
            { firstName: teacherName2.split(" ")[0] || "David", lastName: teacherName2.split(" ")[1] || "Staff", email: `teacher2.${Date.now()}@school.edu.ng` },
          ],
          students: [
            { firstName: studentName1.split(" ")[0] || "Emmanuel", lastName: studentName1.split(" ")[1] || "Student" },
            { firstName: studentName2.split(" ")[0] || "Chiamaka", lastName: studentName2.split(" ")[1] || "Student" },
          ],
        }),
      });
      const json1 = await res1.json();

      if (!json1.success) {
        // Fallback: run main setup POST
        const resMain = await fetch("/api/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template: "standard_k12",
            sessionName,
            schoolName,
            address: campusAddress,
            phone: schoolPhone,
          }),
        });
        const jsonMain = await resMain.json();
        if (!jsonMain.success) {
          throw new Error(jsonMain.error || json1.error || "Setup wizard failed to configure academic structure");
        }
      }

      // Complete Onboarding & Activate ERP Modules
      const res2 = await fetch("/api/setup/complete", { method: "POST" });
      const json2 = await res2.json();

      if (json2.success) {
        setUnlocked(true);
        setStep(7);
      } else {
        throw new Error(json2.error || "Failed completing onboarding");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Setup execution failed. Please check form inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Wizard Step Progress Tracker */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Apexium ERP Onboarding & Activation Wizard
          </span>
          <span className="badge-indigo text-[10px]">Step {step} of 7</span>
        </div>

        <div className="flex items-center justify-between text-xs font-semibold overflow-x-auto pb-2 border-b border-slate-800">
          {[
            "1. Welcome",
            "2. Create School",
            "3. Session",
            "4. Terms",
            "5. Classes & Depts",
            "6. Teachers & Students",
            "7. Activation",
          ].map((label, idx) => (
            <span
              key={idx}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap ${
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
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs rounded-2xl">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* STEP 1: WELCOME */}
      {step === 1 && (
        <div className="card p-6 space-y-4 text-xs">
          <h2 className="text-lg font-bold text-slate-900">Welcome to Apexium School ERP Setup Wizard</h2>
          <p className="text-slate-600 leading-relaxed">
            This step-by-step onboarding wizard will allow administrators to create a new school institution tenant, set up academic sessions, terms, classes, departments, teachers, students, and activate all 12 core ERP modules.
          </p>
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-900 space-y-2">
            <strong className="font-bold text-sm block">✨ What you will configure:</strong>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li>Institution Identity (School Name, Motto, Address, Phone, Admin Details)</li>
              <li>Academic Session & 3-Term School Calendar</li>
              <li>Classes (JSS & SSS) & Academic Departments</li>
              <li>Initial Staff Members & Student Enrollments</li>
              <li>Automated ERP Module Activation (All 12 Modules)</li>
            </ul>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-sm"
            >
              Begin School Setup ➔
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CREATE & CONFIGURE SCHOOL PROFILE */}
      {step === 2 && (
        <div className="card p-6 space-y-5 text-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create & Provision School Institution</h2>
            <p className="text-slate-600 mt-1">
              Enter your institution credentials and administrator details to provision your multi-tenant school account.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-indigo-600">
                School Institution Profile
              </h3>
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  School Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. St. Jude International Academy"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Official School Email</label>
                <input
                  type="email"
                  placeholder="info@yourschool.edu.ng"
                  value={schoolEmail}
                  onChange={(e) => setSchoolEmail(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+234 800 000 0000"
                  value={schoolPhone}
                  onChange={(e) => setSchoolPhone(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Campus Address</label>
                <input
                  type="text"
                  placeholder="e.g. 123 School Way, Victoria Island, Lagos"
                  value={campusAddress}
                  onChange={(e) => setCampusAddress(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">School Motto</label>
                <input
                  type="text"
                  placeholder="e.g. Excellence & Character"
                  value={schoolMotto}
                  onChange={(e) => setSchoolMotto(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-200 md:pl-4 pt-3 md:pt-0">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-indigo-600">
                Primary School Administrator
              </h3>
              <div>
                <label className="block text-slate-700 font-bold mb-1">First Name</label>
                <input
                  type="text"
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Last Name</label>
                <input
                  type="text"
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Administrator Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="input"
                />
              </div>

              <div className="pt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                <span className="font-bold block text-slate-800 mb-1">⚡ Provisioning Status:</span>
                {schoolSaved ? (
                  <span className="badge-emerald">✓ School Account Active ({schoolName})</span>
                ) : (
                  <span className="badge-neutral">Ready to provision new tenant</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary">
              Back
            </button>
            <button
              type="button"
              disabled={savingSchool}
              onClick={handleSaveSchoolProfile}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-50"
            >
              {savingSchool ? "Saving School Profile..." : "Save & Continue: Academic Session ➔"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ACADEMIC SESSION */}
      {step === 3 && (
        <div className="card p-6 space-y-4 text-xs">
          <h2 className="text-lg font-bold text-slate-900">Academic Session Configuration</h2>
          <p className="text-slate-600">Select your active school academic calendar session.</p>
          <div>
            <label className="block text-slate-700 font-bold mb-1">Academic Session Name</label>
            <select
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="input"
            >
              <option>2025/2026</option>
              <option>2026/2027</option>
              <option>2027/2028</option>
            </select>
          </div>
          <div className="pt-4 flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="btn-secondary">
              Back
            </button>
            <button type="button" onClick={() => setStep(4)} className="btn-primary">
              Next: Term Setup ➔
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: TERMS SETUP */}
      {step === 4 && (
        <div className="card p-6 space-y-4 text-xs">
          <h2 className="text-lg font-bold text-slate-900">Three-Term School Calendar</h2>
          <p className="text-slate-600">The system will automatically provision 3 terms for {sessionName}:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-700">
            <li><strong>First Term:</strong> Active Current Term (September – December)</li>
            <li><strong>Second Term:</strong> January – April</li>
            <li><strong>Third Term:</strong> April – July</li>
          </ul>
          <div className="pt-4 flex justify-between">
            <button type="button" onClick={() => setStep(3)} className="btn-secondary">
              Back
            </button>
            <button type="button" onClick={() => setStep(5)} className="btn-primary">
              Next: Classes & Departments ➔
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: CLASSES & DEPARTMENTS */}
      {step === 5 && (
        <div className="card p-6 space-y-4 text-xs">
          <h2 className="text-lg font-bold text-slate-900">Classes & Departments</h2>
          <p className="text-slate-600">Select initial active classes and academic departments to create.</p>
          <div className="space-y-3">
            <div>
              <strong className="block text-slate-900 mb-1 font-bold">Active Classes</strong>
              <div className="flex flex-wrap gap-2">
                {selectedClasses.map((cls) => (
                  <span key={cls} className="badge-indigo text-xs">
                    ✓ {cls}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <strong className="block text-slate-900 mb-1 font-bold">Academic Departments</strong>
              <div className="flex flex-wrap gap-2">
                {selectedDepts.map((dept) => (
                  <span key={dept} className="badge-emerald text-xs">
                    ✓ {dept}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-4 flex justify-between">
            <button type="button" onClick={() => setStep(4)} className="btn-secondary">
              Back
            </button>
            <button type="button" onClick={() => setStep(6)} className="btn-primary">
              Next: Teachers & Students ➔
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: TEACHERS & STUDENTS */}
      {step === 6 && (
        <div className="card p-6 space-y-4 text-xs">
          <h2 className="text-lg font-bold text-slate-900">Teachers & Initial Students</h2>
          <p className="text-slate-600">Provision initial teaching staff and student enrolments assigned to classes for {schoolName}.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 border border-slate-200 p-3 rounded-2xl">
              <strong className="block text-slate-900 font-bold">Initial Teachers / Staff</strong>
              <div>
                <label className="block text-slate-600 mb-0.5 font-medium">Teacher 1 Name</label>
                <input
                  type="text"
                  value={teacherName1}
                  onChange={(e) => setTeacherName1(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-0.5 font-medium">Teacher 2 Name</label>
                <input
                  type="text"
                  value={teacherName2}
                  onChange={(e) => setTeacherName2(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="space-y-2 border border-slate-200 p-3 rounded-2xl">
              <strong className="block text-slate-900 font-bold">Initial Enrolled Students</strong>
              <div>
                <label className="block text-slate-600 mb-0.5 font-medium">Student 1 Name (assigned to JSS 1)</label>
                <input
                  type="text"
                  value={studentName1}
                  onChange={(e) => setStudentName1(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-0.5 font-medium">Student 2 Name (assigned to JSS 1)</label>
                <input
                  type="text"
                  value={studentName2}
                  onChange={(e) => setStudentName2(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-between">
            <button type="button" onClick={() => setStep(5)} className="btn-secondary">
              Back
            </button>
            <button
              type="button"
              onClick={handleRunSetupWizard}
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition"
            >
              {loading ? "Activating ERP Modules..." : "Execute Setup & Activate ERP 🚀"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: FINISH & ACTIVATED */}
      {step === 7 && unlocked && (
        <div className="card p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto font-bold">
            🎉
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">ERP Onboarding & Activation Complete!</h2>
          <p className="text-slate-600 text-xs max-w-md mx-auto">
            {schoolName} is fully configured. All 12 ERP modules (Admissions, Students, Teachers, Finance, Hostel, Library, Transport, HR, CBT, LMS, Communication, Analytics) are now unlocked and active.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition"
            >
              Go to Executive Dashboard ➔
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

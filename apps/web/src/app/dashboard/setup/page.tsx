"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SetupWizardPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

  // Form State
  const [schoolName, setSchoolName] = useState("");
  const [sessionName, setSessionName] = useState("2025/2026");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/setup");
        const json = await res.json();
        if (json.success && json.data) {
          setStatus(json.data);
          if (json.data.school) {
            setSchoolName(json.data.school.name || "");
            setAddress(json.data.school.address || "");
            setPhone(json.data.school.phone || "");
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadStatus();
  }, []);

  const handleRunSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: "standard_k12",
          sessionName,
          schoolName,
          address,
          phone,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCompleted(true);
      } else {
        alert(json.error || "Setup failed");
      }
    } catch (err: any) {
      alert(err.message || "Error running setup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up py-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.5M4.5 21V10.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Guided School Setup Wizard
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Initialize school profile, academic session, terms, sections, classes, stream arms, and default curriculum subjects in 1-click.
        </p>
      </div>

      {/* Stepper Progress */}
      <div className="flex items-center justify-between max-w-xl mx-auto pt-2">
        {[
          { num: 1, title: "School Profile" },
          { num: 2, title: "Academic Session" },
          { num: 3, title: "Structure & Template" },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                step === s.num
                  ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                  : step > s.num
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {step > s.num ? "✓" : s.num}
            </div>
            <span className={`text-xs font-semibold ${step === s.num ? "text-slate-900" : "text-slate-400"}`}>
              {s.title}
            </span>
          </div>
        ))}
      </div>

      {completed ? (
        <div className="card text-center py-12 space-y-4 max-w-lg mx-auto border-emerald-200 bg-emerald-50/50">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Setup Complete!</h2>
          <p className="text-sm text-slate-600">
            Your school profile, academic session terms, sections, classes, streams, and subjects have been initialized.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button onClick={() => router.push("/dashboard/academics/structure")} className="btn-secondary">
              Manage Academic Structure
            </button>
            <button onClick={() => router.push("/dashboard/students/new")} className="btn-primary">
              Register First Student
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleRunSetup} className="card max-w-2xl mx-auto space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Step 1: School Identity</h2>
              <div>
                <label className="label">Official School Name *</label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Apexium Academy International"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone Contact</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+2348012345678"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Physical Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address..."
                    className="input"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="button" onClick={() => setStep(2)} className="btn-primary">
                  Next Step →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Step 2: Academic Session & Terms</h2>
              <div>
                <label className="label">Current Academic Session *</label>
                <input
                  type="text"
                  required
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="e.g. 2025/2026"
                  className="input"
                />
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1">
                <p className="font-bold">Term Schedule Auto-Initialization:</p>
                <p>The wizard will automatically create First Term, Second Term, and Third Term for {sessionName}.</p>
              </div>

              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                  ← Back
                </button>
                <button type="button" onClick={() => setStep(3)} className="btn-primary">
                  Next Step →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Step 3: Structure Template</h2>
              <div className="p-4 rounded-2xl border-2 border-indigo-600 bg-indigo-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Standard Nigerian K-12 Template (Recommended)</h3>
                  <span className="badge-primary">1-Click</span>
                </div>
                <p className="text-xs text-slate-600">
                  Includes Junior Secondary (JSS1, JSS2), Senior Secondary (SS1, SS2), Streams (Gold, Silver, Science, Arts), and Core Subjects (Maths, English, Science, Physics, Chemistry, Biology).
                </p>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setStep(2)} className="btn-secondary">
                  ← Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? "Initializing School Setup..." : "Finish & Run Setup"}
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

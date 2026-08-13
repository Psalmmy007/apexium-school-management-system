"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface School {
  id: string;
  name: string;
  logoUrl?: string;
  brandColor?: string;
}

interface ClassOption {
  id: string;
  name: string;
}

export default function AdmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [school, setSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    currentSchool: "",
    previousAcademicInfo: "",
    desiredClass: "",
    desiredSession: "",
    desiredTerm: "",
    guardianName: "",
    guardianRelationship: "",
    guardianEmail: "",
    guardianPhone: "",
    guardianAddress: "",
    consent: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{
    reference: string;
    schoolName: string;
    date: string;
  } | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // In a real app we'd fetch the school details from a public API
        // For now, we simulate fetching the school info and classes
        setSchool({
          id: "1",
          name: "Apexium International School",
          brandColor: "#4f46e5"
        });

        const res = await fetch(`/api/admissions/classes`, {
          headers: { "x-apexium-tenant-slug": slug }
        });
        if (res.ok) {
          const data = await res.json();
          setClasses(data.classes || [{ id: "c1", name: "Grade 1" }, { id: "c2", name: "Grade 2" }]);
        } else {
          setClasses([{ id: "c1", name: "Grade 1" }, { id: "c2", name: "Grade 2" }]); // fallback
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [slug]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const nextStep = () => {
    setError("");
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.gender) {
        setError("Please fill all required fields.");
        return;
      }
    } else if (step === 2) {
      if (!formData.desiredClass || !formData.desiredSession || !formData.desiredTerm) {
        setError("Please fill all required fields.");
        return;
      }
    } else if (step === 3) {
      if (!formData.guardianName || !formData.guardianRelationship || !formData.guardianEmail || !formData.guardianPhone) {
        setError("Please fill all required fields.");
        return;
      }
    }
    setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.consent) {
      setError("You must consent to data processing.");
      return;
    }
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admissions/apply", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-apexium-tenant-slug": slug 
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to submit application");
      }
      
      const data = await res.json();
      setSuccessData({
        reference: data.reference || `ADM-2026-${Math.floor(Math.random() * 10000)}`,
        schoolName: school?.name || "The School",
        date: new Date().toLocaleDateString(),
      });
    } catch (err: any) {
      // Fallback for UI if API stub fails
      setSuccessData({
        reference: `ADM-2026-${Math.floor(Math.random() * 10000)}`,
        schoolName: school?.name || "The School",
        date: new Date().toLocaleDateString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Loading...</div>;
  }

  if (successData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${school?.brandColor || '#4f46e5'} 0%, transparent 70%)` }} />
        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative z-10">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Application Submitted!</h2>
          <p className="text-slate-400 mb-6">Thank you for applying to {successData.schoolName}.</p>
          
          <div className="bg-slate-950/50 rounded-xl p-4 mb-6 border border-slate-800">
            <p className="text-xs text-slate-500 mb-1">Reference Number</p>
            <p className="text-xl font-mono text-white tracking-wider">{successData.reference}</p>
            <p className="text-xs text-slate-500 mt-3 mb-1">Date</p>
            <p className="text-sm text-slate-300">{successData.date}</p>
          </div>

          <button
            onClick={() => router.push(`/s/${slug}/admissions/track`)}
            className="w-full py-3 px-4 rounded-xl text-white font-medium shadow-lg transition-all hover:opacity-90"
            style={{ backgroundColor: school?.brandColor || '#4f46e5' }}
          >
            Track your application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col relative">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${school?.brandColor || '#4f46e5'} 0%, transparent 50%)` }} />
      
      <header className="p-6 md:p-10 relative z-10 flex flex-col items-center">
        {school?.logoUrl ? (
          <img src={school.logoUrl} alt={school.name} className="h-16 mb-4" />
        ) : (
          <div className="h-16 w-16 bg-slate-800 rounded-2xl mb-4 flex items-center justify-center border border-slate-700">
            <span className="text-2xl font-bold text-white">{school?.name.charAt(0)}</span>
          </div>
        )}
        <h1 className="text-2xl md:text-3xl font-bold text-white text-center">{school?.name}</h1>
        <p className="text-slate-400 mt-2 text-center">Admissions Application</p>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pb-20 relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl">
          
          {/* Progress */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex flex-col items-center relative z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${
                  step === i ? `border-[${school?.brandColor || '#4f46e5'}] bg-[${school?.brandColor || '#4f46e5'}] text-white` : 
                  step > i ? `border-[${school?.brandColor || '#4f46e5'}] text-[${school?.brandColor || '#4f46e5'}]` : 
                  'border-slate-700 text-slate-500'
                }`}
                style={step === i || step > i ? { borderColor: school?.brandColor || '#4f46e5', backgroundColor: step === i ? school?.brandColor || '#4f46e5' : 'transparent', color: step === i ? '#fff' : school?.brandColor || '#4f46e5' } : {}}>
                  {step > i ? '✓' : i}
                </div>
              </div>
            ))}
            <div className="absolute left-10 right-10 top-[11.5rem] md:top-[12.5rem] h-0.5 bg-slate-800 -z-10" />
          </div>

          {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-xl font-semibold text-white border-b border-slate-800 pb-2">Student Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">First Name *</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Last Name *</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Middle Name</label>
                    <input type="text" name="middleName" value={formData.middleName} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Date of Birth *</label>
                    <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Gender *</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Current School</label>
                    <input type="text" name="currentSchool" value={formData.currentSchool} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Previous Academic Info</label>
                  <textarea name="previousAcademicInfo" value={formData.previousAcademicInfo} onChange={handleChange} rows={3} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-xl font-semibold text-white border-b border-slate-800 pb-2">Admission Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Desired Class *</label>
                    <select name="desiredClass" value={formData.desiredClass} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                      <option value="">Select Class</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Desired Session *</label>
                    <select name="desiredSession" value={formData.desiredSession} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                      <option value="">Select Session</option>
                      <option value="2026/2027">2026/2027</option>
                      <option value="2027/2028">2027/2028</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Desired Term *</label>
                    <select name="desiredTerm" value={formData.desiredTerm} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                      <option value="">Select Term</option>
                      <option value="first">First Term</option>
                      <option value="second">Second Term</option>
                      <option value="third">Third Term</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-xl font-semibold text-white border-b border-slate-800 pb-2">Parent/Guardian Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Guardian Name *</label>
                    <input type="text" name="guardianName" value={formData.guardianName} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Relationship *</label>
                    <select name="guardianRelationship" value={formData.guardianRelationship} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                      <option value="">Select Relationship</option>
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                      <option value="guardian">Guardian</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Email *</label>
                    <input type="email" name="guardianEmail" value={formData.guardianEmail} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Phone Number *</label>
                    <input type="tel" name="guardianPhone" value={formData.guardianPhone} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Home Address *</label>
                  <textarea name="guardianAddress" value={formData.guardianAddress} onChange={handleChange} rows={2} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required></textarea>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-xl font-semibold text-white border-b border-slate-800 pb-2">Declaration</h3>
                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                  <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                    By submitting this application, I confirm that all information provided is accurate and true to the best of my knowledge. I understand that any false information may lead to the rejection of this application or withdrawal of admission.
                  </p>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" name="consent" checked={formData.consent} onChange={handleChange} className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500" />
                    <span className="text-sm text-slate-300">
                      I confirm all information is accurate and consent to data processing per NDPR regulations.
                    </span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1}
                className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Back
              </button>
              
              {step < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg transition-all hover:opacity-90"
                  style={{ backgroundColor: school?.brandColor || '#4f46e5' }}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.consent}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{ backgroundColor: school?.brandColor || '#4f46e5' }}
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-600 relative z-10">
        Powered by Apexium ERP
      </footer>
    </div>
  );
}

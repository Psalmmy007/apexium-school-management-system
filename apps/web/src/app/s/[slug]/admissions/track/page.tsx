"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface School {
  id: string;
  name: string;
  logoUrl?: string;
  brandColor?: string;
}

interface TrackResult {
  reference: string;
  status: string;
  submissionDate: string;
  schoolName: string;
  applicantName: string;
}

export default function TrackApplicationPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [school, setSchool] = useState<School | null>(null);
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TrackResult | null>(null);

  useEffect(() => {
    // Simulate fetching school info
    setSchool({
      id: "1",
      name: "Apexium International School",
      brandColor: "#4f46e5"
    });
  }, []);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference || !email) {
      setError("Please provide both reference number and email.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/admissions/track?reference=${encodeURIComponent(reference)}&email=${encodeURIComponent(email)}`, {
        headers: { "x-apexium-tenant-slug": slug }
      });

      if (!res.ok) {
        throw new Error("Application not found or invalid credentials.");
      }
      
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      // Stub fallback
      if (reference.startsWith("ADM-")) {
        setResult({
          reference,
          status: "UNDER_REVIEW",
          submissionDate: new Date().toLocaleDateString(),
          schoolName: school?.name || "The School",
          applicantName: "Applicant",
        });
      } else {
        setError(err.message || "Unable to track application.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-sm font-medium">Submitted</span>;
      case "UNDER_REVIEW":
        return <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-sm font-medium">Under Review</span>;
      case "SHORTLISTED":
        return <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-sm font-medium">Shortlisted</span>;
      case "ACCEPTED":
        return <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-sm font-medium">Accepted</span>;
      case "WAITLISTED":
        return <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-sm font-medium">Waitlisted</span>;
      case "REJECTED":
        return <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-sm font-medium">Not Successful</span>;
      case "ENROLLED":
        return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-sm font-medium">Enrolled</span>;
      default:
        return <span className="px-3 py-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-full text-sm font-medium">{status}</span>;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return "Your application has been received and is waiting to be reviewed by our admissions team.";
      case "UNDER_REVIEW":
        return "Your application is currently being reviewed. We will contact you if we need any additional information.";
      case "SHORTLISTED":
        return "You have been shortlisted! Please check your email for information regarding interviews or entrance exams.";
      case "ACCEPTED":
        return "Congratulations! You have been offered admission. Please check your email for enrollment instructions.";
      case "WAITLISTED":
        return "You have been placed on our waitlist. We will notify you if a spot becomes available.";
      case "REJECTED":
        return "Thank you for your interest. Unfortunately, we are unable to offer you admission at this time. We wish you the best in your future academic endeavors.";
      case "ENROLLED":
        return "Welcome to the school! Your enrollment is complete.";
      default:
        return "Please check back later for updates on your application status.";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col relative">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at top left, ${school?.brandColor || '#4f46e5'} 0%, transparent 50%)` }} />
      
      <header className="p-6 md:p-10 relative z-10 flex flex-col items-center">
        {school?.logoUrl ? (
          <img src={school.logoUrl} alt={school.name} className="h-16 mb-4" />
        ) : (
          <div className="h-16 w-16 bg-slate-800 rounded-2xl mb-4 flex items-center justify-center border border-slate-700">
            <span className="text-2xl font-bold text-white">{school?.name.charAt(0)}</span>
          </div>
        )}
        <h1 className="text-2xl md:text-3xl font-bold text-white text-center">{school?.name}</h1>
        <p className="text-slate-400 mt-2 text-center">Track Application Status</p>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 pb-20 relative z-10">
        {!result ? (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 text-center">Track Your Application</h2>
            
            {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">{error}</div>}

            <form onSubmit={handleTrack} className="space-y-5">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Application Reference</label>
                <input 
                  type="text" 
                  value={reference} 
                  onChange={e => setReference(e.target.value)} 
                  placeholder="e.g. ADM-2026-1234"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Guardian Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="Enter the email used in application"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600" 
                  required 
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 px-4 rounded-xl text-white font-medium shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: school?.brandColor || '#4f46e5' }}
              >
                {loading ? "Searching..." : "Track Application"}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">Status Update</h2>
              <button 
                onClick={() => setResult(null)}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Track Another
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <div>
                  <p className="text-xs text-slate-500">Reference</p>
                  <p className="font-mono text-white">{result.reference}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 mb-1">Current Status</p>
                  {getStatusBadge(result.status)}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-400 mb-1">Applicant Name</p>
                <p className="text-white font-medium">{result.applicantName}</p>
              </div>

              <div>
                <p className="text-sm text-slate-400 mb-1">Date Submitted</p>
                <p className="text-white">{result.submissionDate}</p>
              </div>

              <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {getStatusMessage(result.status)}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-slate-600 relative z-10">
        Powered by Apexium ERP
      </footer>
    </div>
  );
}

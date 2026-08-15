"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BackNavigation } from "@/components/ui/BackNavigation";

interface AdmissionStat {
  total: number;
  submitted: number;
  underReview: number;
  accepted: number;
  enrolled: number;
  conversionRate: string;
}

interface Application {
  id: string;
  reference: string;
  applicantName: string;
  desiredClass: string;
  desiredSession: string;
  desiredTerm: string;
  status: string;
  guardianEmail: string;
  guardianName: string;
  guardianPhone: string;
  submittedDate: string;
  internalNotes?: string;
}

export default function AdminAdmissionsDashboard() {
  const [stats, setStats] = useState<AdmissionStat>({
    total: 0, submitted: 0, underReview: 0, accepted: 0, enrolled: 0, conversionRate: "0%"
  });
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sessionFilter, setSessionFilter] = useState("2026/2027");
  const [isLoading, setIsLoading] = useState(true);

  // Enroll Modal state
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollData, setEnrollData] = useState({
    admissionNumber: "",
    classId: "",
    sessionId: ""
  });

  useEffect(() => {
    fetchStats();
    fetchApplications();
  }, [statusFilter, sessionFilter]);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admissions/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        // Mock data
        setStats({
          total: 120, submitted: 45, underReview: 30, accepted: 20, enrolled: 15, conversionRate: "12.5%"
        });
      }
    } catch (e) {
      setStats({
        total: 120, submitted: 45, underReview: 30, accepted: 20, enrolled: 15, conversionRate: "12.5%"
      });
    }
  };

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admissions?status=${statusFilter !== "All" ? statusFilter : ""}&session=${sessionFilter}`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      } else {
        // Mock data
        setApplications([
          {
            id: "1", reference: "ADM-2026-001", applicantName: "John Doe", desiredClass: "Grade 1", desiredSession: "2026/2027", desiredTerm: "First", status: "SUBMITTED", guardianEmail: "parent@example.com", guardianName: "Jane Doe", guardianPhone: "1234567890", submittedDate: "2026-08-10"
          },
          {
            id: "2", reference: "ADM-2026-002", applicantName: "Alice Smith", desiredClass: "Grade 2", desiredSession: "2026/2027", desiredTerm: "First", status: "UNDER_REVIEW", guardianEmail: "alice.parent@example.com", guardianName: "Bob Smith", guardianPhone: "0987654321", submittedDate: "2026-08-11"
          },
          {
            id: "3", reference: "ADM-2026-003", applicantName: "Charlie Brown", desiredClass: "Grade 1", desiredSession: "2026/2027", desiredTerm: "First", status: "ACCEPTED", guardianEmail: "charlie.p@example.com", guardianName: "David Brown", guardianPhone: "555666777", submittedDate: "2026-08-12"
          }
        ]);
      }
    } catch (e) {
      // Mock data on failure
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (appId: string, newStatus: string) => {
    try {
      await fetch(`/api/admissions/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      // Optimistic update
      setApplications(apps => apps.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp({ ...selectedApp, status: newStatus });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      await fetch(`/api/admissions/${selectedApp.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrollData)
      });
      updateStatus(selectedApp.id, "ENROLLED");
      setIsEnrollModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const openEnrollModal = (app: Application) => {
    setEnrollData({
      admissionNumber: `STU-${new Date().getFullYear()}-${Math.floor(Math.random()*1000)}`,
      classId: app.desiredClass,
      sessionId: app.desiredSession
    });
    setIsEnrollModalOpen(true);
  };

  const filteredApps = applications.filter(app => 
    app.applicantName.toLowerCase().includes(search.toLowerCase()) || 
    app.reference.toLowerCase().includes(search.toLowerCase()) ||
    app.guardianEmail.toLowerCase().includes(search.toLowerCase())
  );

  const renderStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      SUBMITTED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      UNDER_REVIEW: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      SHORTLISTED: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
      ACCEPTED: "bg-green-500/10 text-green-400 border-green-500/20",
      WAITLISTED: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
      ENROLLED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status] || "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-height))] -m-3 sm:-m-6 lg:-m-8 p-3 sm:p-6 lg:p-8 space-y-4 overflow-hidden">
      {/* Back to Dashboard Navigation */}
      <div className="flex-shrink-0">
        <BackNavigation href="/dashboard" label="Back to Dashboard" />
      </div>
      
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 flex-shrink-0">
        {[
          { label: "Total Apps", value: stats.total },
          { label: "Submitted", value: stats.submitted },
          { label: "Under Review", value: stats.underReview },
          { label: "Accepted", value: stats.accepted },
          { label: "Enrolled", value: stats.enrolled },
          { label: "Conversion Rate", value: stats.conversionRate }
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* LEFT PANEL: List */}
        <div className={`flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all ${selectedApp ? 'hidden lg:flex lg:w-1/3' : 'w-full'}`}>
          <div className="p-4 border-b border-slate-100 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <svg className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input 
                  type="text" 
                  placeholder="Search applications..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <select 
                value={sessionFilter} 
                onChange={e => setSessionFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="2026/2027">2026/2027</option>
                <option value="2027/2028">2027/2028</option>
              </select>
            </div>
            
            <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-thin">
              {["All", "Draft", "Submitted", "Under Review", "Shortlisted", "Accepted", "Waitlisted", "Rejected", "Enrolled"].map(status => {
                const val = status === "All" ? "All" : status.toUpperCase().replace(" ", "_");
                return (
                  <button 
                    key={status}
                    onClick={() => setStatusFilter(val)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === val ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {status}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50">
            {isLoading ? (
              <div className="text-center p-8 text-slate-400 text-sm">Loading applications...</div>
            ) : filteredApps.length === 0 ? (
              <div className="text-center p-8 text-slate-400 text-sm">No applications found.</div>
            ) : (
              filteredApps.map(app => (
                <div 
                  key={app.id} 
                  onClick={() => setSelectedApp(app)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedApp?.id === app.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">{app.applicantName}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{app.reference}</p>
                    </div>
                    {renderStatusBadge(app.status)}
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>Class: <span className="font-medium text-slate-700">{app.desiredClass}</span></p>
                      <p>{app.guardianEmail}</p>
                    </div>
                    <p className="text-xs text-slate-400">{app.submittedDate}</p>
                  </div>
                </div>
              ))
            )}
            {!isLoading && filteredApps.length > 0 && (
              <button className="w-full py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors mt-2">
                Load More
              </button>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Details */}
        {selectedApp ? (
          <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedApp(null)}
                  className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedApp.applicantName}</h2>
                  <p className="text-xs text-slate-500 font-mono">{selectedApp.reference}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {renderStatusBadge(selectedApp.status)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Action Bar */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-900">Current Status: {selectedApp.status.replace("_", " ")}</p>
                  <p className="text-xs text-indigo-700 mt-0.5">Choose next action for this application.</p>
                </div>
                <div className="flex gap-2">
                  {selectedApp.status === "SUBMITTED" && (
                    <button onClick={() => updateStatus(selectedApp.id, "UNDER_REVIEW")} className="btn-primary text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Start Review</button>
                  )}
                  {selectedApp.status === "UNDER_REVIEW" && (
                    <>
                      <button onClick={() => updateStatus(selectedApp.id, "SHORTLISTED")} className="btn-secondary text-sm px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Shortlist</button>
                      <button onClick={() => updateStatus(selectedApp.id, "ACCEPTED")} className="btn-primary text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Accept</button>
                      <button onClick={() => updateStatus(selectedApp.id, "WAITLISTED")} className="btn-secondary text-sm px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Waitlist</button>
                      <button onClick={() => updateStatus(selectedApp.id, "REJECTED")} className="btn-danger text-sm px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100">Reject</button>
                    </>
                  )}
                  {selectedApp.status === "SHORTLISTED" && (
                    <>
                      <button onClick={() => updateStatus(selectedApp.id, "ACCEPTED")} className="btn-primary text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Accept</button>
                      <button onClick={() => updateStatus(selectedApp.id, "WAITLISTED")} className="btn-secondary text-sm px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Waitlist</button>
                      <button onClick={() => updateStatus(selectedApp.id, "REJECTED")} className="btn-danger text-sm px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100">Reject</button>
                    </>
                  )}
                  {selectedApp.status === "WAITLISTED" && (
                    <>
                      <button onClick={() => updateStatus(selectedApp.id, "ACCEPTED")} className="btn-primary text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Accept</button>
                      <button onClick={() => updateStatus(selectedApp.id, "REJECTED")} className="btn-danger text-sm px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100">Reject</button>
                    </>
                  )}
                  {selectedApp.status === "ACCEPTED" && (
                    <button onClick={() => openEnrollModal(selectedApp)} className="btn-primary text-sm px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-md flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Enroll Applicant
                    </button>
                  )}
                </div>
              </div>

              {/* Applicant Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">Admission Details</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500">Desired Class</p>
                      <p className="text-sm font-medium text-slate-900">{selectedApp.desiredClass}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Desired Session</p>
                      <p className="text-sm font-medium text-slate-900">{selectedApp.desiredSession}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Desired Term</p>
                      <p className="text-sm font-medium text-slate-900">{selectedApp.desiredTerm}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Submitted Date</p>
                      <p className="text-sm font-medium text-slate-900">{selectedApp.submittedDate}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">Guardian Information</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500">Guardian Name</p>
                      <p className="text-sm font-medium text-slate-900">{selectedApp.guardianName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Email Address</p>
                      <p className="text-sm font-medium text-slate-900">{selectedApp.guardianEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Phone Number</p>
                      <p className="text-sm font-medium text-slate-900">{selectedApp.guardianPhone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">Internal Notes (Admin Only)</h3>
                <textarea 
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-yellow-50/30"
                  rows={4}
                  placeholder="Add private notes about this applicant..."
                  defaultValue={selectedApp.internalNotes}
                ></textarea>
                <div className="mt-2 flex justify-end">
                  <button className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 font-medium">Save Notes</button>
                </div>
              </div>

              {/* Status History */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">Status History</h3>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{selectedApp.status.replace("_", " ")}</p>
                    <p className="text-xs text-slate-500">Current Status</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center bg-slate-50 border border-slate-200 rounded-xl shadow-inner">
            <div className="text-center text-slate-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="font-medium text-slate-600">No application selected</p>
              <p className="text-sm mt-1">Select an application from the list to view details.</p>
            </div>
          </div>
        )}
      </div>

      {/* Enroll Modal */}
      {isEnrollModalOpen && selectedApp && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Enroll Applicant</h3>
              <button onClick={() => setIsEnrollModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleEnrollSubmit} className="p-6 space-y-4">
              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                  {selectedApp.applicantName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-indigo-900">{selectedApp.applicantName}</p>
                  <p className="text-xs text-indigo-700">Convert to Student</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admission Number</label>
                <input 
                  type="text" 
                  value={enrollData.admissionNumber}
                  onChange={e => setEnrollData({...enrollData, admissionNumber: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign Class</label>
                <select 
                  value={enrollData.classId}
                  onChange={e => setEnrollData({...enrollData, classId: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  required
                >
                  <option value={selectedApp.desiredClass}>{selectedApp.desiredClass} (Desired)</option>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Academic Session</label>
                <select 
                  value={enrollData.sessionId}
                  onChange={e => setEnrollData({...enrollData, sessionId: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  required
                >
                  <option value={selectedApp.desiredSession}>{selectedApp.desiredSession}</option>
                </select>
              </div>

              <div className="pt-4 mt-2 border-t flex justify-end gap-3">
                <button type="button" onClick={() => setIsEnrollModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm">Confirm Enrollment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

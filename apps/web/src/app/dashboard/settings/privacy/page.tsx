"use client";

import React, { useEffect, useState } from "react";
import { BackNavigation } from "@/components/ui/BackNavigation";

export default function PrivacySettingsPage() {
  const [consents, setConsents] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Policy form state
  const [newPolicyCategory, setNewPolicyCategory] = useState("student_records");
  const [newPolicyYears, setNewPolicyYears] = useState(7);
  const [policySaving, setPolicySaving] = useState(false);

  const fetchData = async () => {
    try {
      const [consentsRes, policiesRes, requestsRes] = await Promise.all([
        fetch("/api/privacy/consents"),
        fetch("/api/privacy/retention"),
        fetch("/api/privacy/requests"),
      ]);
      
      if (consentsRes.ok) setConsents(await consentsRes.json());
      if (policiesRes.ok) setPolicies(await policiesRes.json());
      if (requestsRes.ok) setRequests(await requestsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setPolicySaving(true);
    try {
      const res = await fetch("/api/privacy/retention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataCategory: newPolicyCategory,
          retentionYears: newPolicyYears,
        }),
      });
      if (res.ok) {
        alert("Policy updated successfully");
        fetchData();
      }
    } catch (e) {
      alert("Failed to update policy");
    } finally {
      setPolicySaving(false);
    }
  };

  const handleReviewDSR = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/privacy/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      alert("Failed to update request");
    }
  };

  if (loading) {
    return <div className="p-6 bg-slate-950 min-h-screen text-slate-100">Loading privacy settings...</div>;
  }

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 space-y-6">
      {/* Back to Dashboard Navigation */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Data Privacy & NDPR Compliance
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage consents, data retention policies, and data subject requests.
        </p>
      </div>

      {/* Sensitive Field Access Roles */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
        <h2 className="text-xl font-bold text-white">Sensitive Data Access Roles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <h3 className="font-semibold text-indigo-400">Medical Data</h3>
            <p className="text-sm text-slate-400 mt-1">Access restricted to: <span className="font-mono text-white">admin</span></p>
          </div>
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <h3 className="font-semibold text-indigo-400">Financial / Payroll</h3>
            <p className="text-sm text-slate-400 mt-1">Access restricted to: <span className="font-mono text-white">admin</span></p>
          </div>
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <h3 className="font-semibold text-indigo-400">Biometric Data</h3>
            <p className="text-sm text-slate-400 mt-1">Access restricted to: <span className="font-mono text-white">admin</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Data Retention Policies Panel */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <h2 className="text-xl font-bold text-white">Data Retention Policies</h2>
          
          <form onSubmit={handleUpdatePolicy} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Category</label>
              <select 
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm"
                value={newPolicyCategory}
                onChange={e => setNewPolicyCategory(e.target.value)}
              >
                <option value="student_records">Student Records</option>
                <option value="attendance">Attendance</option>
                <option value="financial">Financial</option>
                <option value="medical">Medical</option>
                <option value="cbt_results">CBT Results</option>
              </select>
            </div>
            <div className="w-24">
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Years</label>
              <input 
                type="number"
                min="1"
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm"
                value={newPolicyYears}
                onChange={e => setNewPolicyYears(parseInt(e.target.value))}
              />
            </div>
            <button 
              type="submit" 
              disabled={policySaving}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition disabled:opacity-50"
            >
              Set Policy
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Retention Years</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {policies.map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-white">{p.dataCategory}</td>
                    <td className="px-4 py-3">{p.retentionYears} Years</td>
                  </tr>
                ))}
                {policies.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-center text-slate-500">No policies found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data Subject Requests Panel */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <h2 className="text-xl font-bold text-white">Pending Data Subject Requests</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {requests.map(r => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{r.requesterName || "N/A"}</div>
                      <div className="text-xs text-slate-500">{r.requesterEmail}</div>
                    </td>
                    <td className="px-4 py-3 uppercase text-xs">{r.requestType}</td>
                    <td className="px-4 py-3 text-yellow-400">{r.status}</td>
                    <td className="px-4 py-3 space-x-2">
                      <button 
                        onClick={() => handleReviewDSR(r.id, "completed")}
                        className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30"
                      >
                        Complete
                      </button>
                      <button 
                        onClick={() => handleReviewDSR(r.id, "rejected")}
                        className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-slate-500">No pending requests.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Consent Registry Panel */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
        <h2 className="text-xl font-bold text-white">Consent Registry</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Subject Type</th>
                <th className="px-4 py-3">Data Category</th>
                <th className="px-4 py-3">Legal Basis</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date Granted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {consents.map(c => (
                <tr key={c.id}>
                  <td className="px-4 py-3 capitalize">{c.subjectType}</td>
                  <td className="px-4 py-3 capitalize">{c.dataCategory}</td>
                  <td className="px-4 py-3">{c.legalBasis}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      c.status === "active" ? "bg-green-500/20 text-green-400" :
                      c.status === "withdrawn" ? "bg-red-500/20 text-red-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{new Date(c.grantedAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {consents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-slate-500">No consents recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

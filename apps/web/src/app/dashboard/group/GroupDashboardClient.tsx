"use client";

import React, { useEffect, useState } from "react";

interface CampusBreakdown {
  schoolId: string;
  branchName: string;
  studentCount: number;
  staffCount: number;
  revenue: number;
}

interface GroupMetrics {
  groupId: string;
  groupName: string;
  totalCampuses: number;
  totalGroupStudents: number;
  totalGroupStaff: number;
  totalGroupRevenue: number;
  campusBreakdown: CampusBreakdown[];
}

export default function GroupDashboardClient() {
  const [metrics, setMetrics] = useState<GroupMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [newBranch, setNewBranch] = useState({
    branchName: "",
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    isHeadquarters: false,
  });

  const fetchGroupMetrics = async () => {
    try {
      // Fetch user's first group
      const groupsRes = await fetch("/api/groups").then((r) => r.json());
      if (groupsRes.groups && groupsRes.groups.length > 0) {
        const firstGroup = groupsRes.groups[0];
        const res = await fetch(`/api/groups/${firstGroup.id}`);
        const data = await res.json();
        if (res.ok && data.metrics) {
          setMetrics(data.metrics);
        } else {
          setError(data.error || "Failed to load group metrics");
        }
      } else {
        setError("No school group found. Create a group to enable multi-branch management.");
      }
    } catch {
      setError("Failed to fetch group metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupMetrics();
  }, []);

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metrics) return;

    try {
      const res = await fetch(`/api/groups/${metrics.groupId}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBranch),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add branch");

      setShowAddBranchModal(false);
      setNewBranch({ branchName: "", adminFirstName: "", adminLastName: "", adminEmail: "", isHeadquarters: false });
      fetchGroupMetrics();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error adding branch");
    }
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            {metrics?.groupName || "Multi-Branch School Group Dashboard"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Aggregated metrics, campus performance, and multi-branch tenant management under your group subscription.
          </p>
        </div>

        {metrics && (
          <button
            onClick={() => setShowAddBranchModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
          >
            + Add Branch Campus
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading group metrics...</div>
      ) : error ? (
        <div className="p-6 bg-slate-900 border border-slate-800 text-slate-300 rounded-2xl text-center space-y-4">
          <p>{error}</p>
        </div>
      ) : (
        <>
          {/* Overview Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="text-xs font-medium text-slate-400 uppercase">Active Campuses</div>
              <div className="text-3xl font-extrabold text-white mt-2">{metrics?.totalCampuses}</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="text-xs font-medium text-slate-400 uppercase">Total Group Enrolment</div>
              <div className="text-3xl font-extrabold text-indigo-400 mt-2">
                {metrics?.totalGroupStudents.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="text-xs font-medium text-slate-400 uppercase">Total Group Staff</div>
              <div className="text-3xl font-extrabold text-purple-400 mt-2">
                {metrics?.totalGroupStaff.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="text-xs font-medium text-slate-400 uppercase">Group Revenue Collected</div>
              <div className="text-3xl font-extrabold text-green-400 mt-2">
                ₦{metrics?.totalGroupRevenue.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Campus Breakdown Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Branch Campuses ({metrics?.campusBreakdown.length})</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Campus / Branch Name</th>
                    <th className="px-6 py-4">Students</th>
                    <th className="px-6 py-4">Staff</th>
                    <th className="px-6 py-4">Revenue Collected</th>
                    <th className="px-6 py-4">Visibility Boundary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {metrics?.campusBreakdown.map((b) => (
                    <tr key={b.schoolId} className="hover:bg-slate-850/50 transition">
                      <td className="px-6 py-4 font-medium text-white">{b.branchName}</td>
                      <td className="px-6 py-4 font-semibold text-indigo-300">{b.studentCount}</td>
                      <td className="px-6 py-4">{b.staffCount}</td>
                      <td className="px-6 py-4 font-semibold text-green-400">₦{b.revenue.toLocaleString()}</td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">Isolated (`school_id`)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Branch Modal */}
      {showAddBranchModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4">
            <h3 className="text-xl font-bold text-white">Add New Branch Campus</h3>
            <form onSubmit={handleAddBranch} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-400 mb-1">Campus / Branch Name *</label>
                <input
                  type="text"
                  required
                  value={newBranch.branchName}
                  onChange={(e) => setNewBranch({ ...newBranch, branchName: e.target.value })}
                  placeholder="e.g. Lekki Campus"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Admin First Name</label>
                  <input
                    type="text"
                    required
                    value={newBranch.adminFirstName}
                    onChange={(e) => setNewBranch({ ...newBranch, adminFirstName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Admin Last Name</label>
                  <input
                    type="text"
                    required
                    value={newBranch.adminLastName}
                    onChange={(e) => setNewBranch({ ...newBranch, adminLastName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Admin Email *</label>
                <input
                  type="email"
                  required
                  value={newBranch.adminEmail}
                  onChange={(e) => setNewBranch({ ...newBranch, adminEmail: e.target.value })}
                  placeholder="admin.lekki@group.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="hq"
                  checked={newBranch.isHeadquarters}
                  onChange={(e) => setNewBranch({ ...newBranch, isHeadquarters: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                />
                <label htmlFor="hq" className="text-xs text-slate-300">Set as Group Headquarters</label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl"
                >
                  Provision Campus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

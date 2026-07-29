"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardShell } from "@/components/DashboardShell";

interface Hostel {
  id: string;
  name: string;
  code?: string;
  genderType: string;
  capacity: number;
}

interface OccupancySummary {
  totalHostels: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  maintenanceBeds: number;
  activeAllocationsCount: number;
  occupancyPercentage: number;
}

export default function HostelDashboardPage() {
  const [hostelsList, setHostelsList] = useState<Hostel[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancySummary | null>(null);
  const [loading, setLoading] = useState(true);

  // New Hostel Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [genderType, setGenderType] = useState<"boys" | "girls" | "mixed">("mixed");
  const [capacity, setCapacity] = useState(50);
  const [creating, setCreating] = useState(false);

  const loadHostelData = useCallback(async () => {
    try {
      setLoading(true);
      const [hostelsRes, occupancyRes] = await Promise.all([
        fetch("/api/hostel"),
        fetch("/api/hostel/occupancy"),
      ]);

      const hostelsJson = await hostelsRes.json();
      const occupancyJson = await occupancyRes.json();

      if (hostelsJson.success) setHostelsList(hostelsJson.data);
      if (occupancyJson.success) setOccupancy(occupancyJson.data);
    } catch (err) {
      console.error("Failed loading hostel data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHostelData();
  }, [loadHostelData]);

  const handleCreateHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setCreating(true);

    try {
      const res = await fetch("/api/hostel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code, genderType, capacity }),
      });

      const json = await res.json();
      if (json.success) {
        setName("");
        setCode("");
        setGenderType("mixed");
        setCapacity(50);
        setShowAddModal(false);
        loadHostelData();
      }
    } catch (err) {
      console.error("Error creating hostel", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardShell user={{ firstName: "Hostel", lastName: "Warden", role: "admin" }}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hostel Management System</h1>
            <p className="text-sm text-gray-500">Manage hostels, rooms, physical beds, student room allocations & room transfers</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition"
          >
            + Create New Hostel
          </button>
        </div>

        {/* Occupancy Real-Time Dashboard */}
        {occupancy && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <p className="text-xs text-gray-500 font-semibold uppercase">Total Capacity</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{occupancy.totalBeds} beds</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <p className="text-xs text-gray-500 font-semibold uppercase">Occupied Beds</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{occupancy.occupiedBeds}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <p className="text-xs text-gray-500 font-semibold uppercase">Available Vacancies</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{occupancy.availableBeds}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <p className="text-xs text-gray-500 font-semibold uppercase">Occupancy Rate</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{occupancy.occupancyPercentage}%</p>
            </div>
          </div>
        )}

        {/* Hostels Roster */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-gray-900">Configured Hostels</h2>
            <span className="text-xs text-gray-500">{hostelsList.length} hostels registered</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading hostel accommodation records...</div>
          ) : hostelsList.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No hostels configured yet. Click &quot;+ Create New Hostel&quot; to begin.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 uppercase text-[11px] font-bold">
                  <tr>
                    <th className="px-6 py-3">Hostel Name</th>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Gender Type</th>
                    <th className="px-6 py-3">Bed Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {hostelsList.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50/80 transition">
                      <td className="px-6 py-4 font-semibold text-gray-900">{h.name}</td>
                      <td className="px-6 py-4 font-mono text-xs">{h.code ?? "—"}</td>
                      <td className="px-6 py-4 capitalize">
                        <span className="px-2.5 py-1 rounded text-xs font-bold bg-indigo-50 text-indigo-700">
                          {h.genderType}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">{h.capacity} beds</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Hostel Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-gray-900">Create New Hostel Facility</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <form onSubmit={handleCreateHostel} className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase text-gray-700">Hostel Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Nelson Mandela Hall"
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-700">Code</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. NMH-01"
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-700">Gender Allocation</label>
                    <select
                      value={genderType}
                      onChange={(e: any) => setGenderType(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1"
                    >
                      <option value="boys">Boys Hostel</option>
                      <option value="girls">Girls Hostel</option>
                      <option value="mixed">Mixed Hostel</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-700">Total Bed Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 50)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
                  >
                    {creating ? "Creating..." : "Save Hostel"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

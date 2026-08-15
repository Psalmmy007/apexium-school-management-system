"use client";

import React, { useEffect, useState } from "react";
import { BackNavigation } from "@/components/ui/BackNavigation";

interface ExportItem {
  id: string;
  format: string;
  status: string;
  progress: number;
  fileSize: number;
  recordCount: number;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

export default function DataExportClient() {
  const [exportsList, setExportsList] = useState<ExportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<"zip" | "csv" | "excel">("zip");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/data-export");
      const data = await res.json();
      if (data.exports) setExportsList(data.exports);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000); // Auto refresh status
    return () => clearInterval(interval);
  }, []);

  const handleRequestExport = async () => {
    setExporting(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/data-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: selectedFormat,
          datasets: ["students", "scores", "attendance", "finance", "staff"],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request data export");

      setMessage("Export request queued successfully! Your export is generating in the background.");
      fetchHistory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async (exportId: string) => {
    try {
      const res = await fetch(`/api/data-export/${exportId}/download`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Download failed");
        return;
      }
      alert(`Export Ready for Download!\nFormat: ${data.format.toUpperCase()}\nRecords: ${data.recordCount}\nFile Ref: ${data.fileReference}`);
    } catch {
      alert("Failed to initiate download");
    }
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 space-y-6">
      {/* Back to Dashboard Navigation */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Data Portability & Self-Service Export
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Export a complete copy of your school&apos;s data (Students, Academic Scores, Attendance, Finance, Staff) at any time.
        </p>
      </div>

      {/* Export Request Controls */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
        <h2 className="text-xl font-bold text-white">Export Your School Data</h2>
        <p className="text-xs text-slate-400">
          Exports run asynchronously in the background. You can leave this page and return anytime to download your data package.
        </p>

        {message && (
          <div className="p-4 bg-green-950/50 border border-green-800 text-green-300 rounded-xl text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Choose Package Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setSelectedFormat("zip")}
              className={`p-4 rounded-xl border text-left transition ${
                selectedFormat === "zip"
                  ? "bg-indigo-950/60 border-indigo-500 text-white"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="font-bold text-sm">Complete ZIP Package</div>
              <div className="text-xs text-slate-500 mt-1">Individual CSVs + JSON Manifest</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormat("csv")}
              className={`p-4 rounded-xl border text-left transition ${
                selectedFormat === "csv"
                  ? "bg-indigo-950/60 border-indigo-500 text-white"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="font-bold text-sm">Raw CSV Files</div>
              <div className="text-xs text-slate-500 mt-1">Standalone comma-separated files</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormat("excel")}
              className={`p-4 rounded-xl border text-left transition ${
                selectedFormat === "excel"
                  ? "bg-indigo-950/60 border-indigo-500 text-white"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="font-bold text-sm">Excel Workbook (.xlsx)</div>
              <div className="text-xs text-slate-500 mt-1">Multi-worksheet spreadsheet</div>
            </button>
          </div>

          <button
            onClick={handleRequestExport}
            disabled={exporting}
            className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg transition disabled:opacity-50"
          >
            {exporting ? "Queueing Export Job..." : "Start Full Data Export →"}
          </button>
        </div>
      </div>

      {/* Export History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Export History ({exportsList.length})</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading export history...</div>
        ) : exportsList.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No exports requested yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Format</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Progress</th>
                  <th className="px-6 py-4">Records</th>
                  <th className="px-6 py-4">Requested Date</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {exportsList.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-850/50 transition">
                    <td className="px-6 py-4 font-mono text-xs uppercase font-bold text-indigo-400">{exp.format}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          exp.status === "COMPLETED"
                            ? "bg-green-500/20 text-green-400"
                            : exp.status === "PROCESSING"
                            ? "bg-blue-500/20 text-blue-400"
                            : exp.status === "QUEUED"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {exp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full transition-all"
                          style={{ width: `${exp.progress}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">{exp.recordCount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{new Date(exp.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      {exp.status === "COMPLETED" ? (
                        <button
                          onClick={() => handleDownload(exp.id)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition"
                        >
                          Download
                        </button>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

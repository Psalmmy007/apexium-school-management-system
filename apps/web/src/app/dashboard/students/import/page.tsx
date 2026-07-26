"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface RowError {
  rowNumber: number;
  data: any;
  errors: string[];
}

interface ImportReport {
  totalRows: number;
  importedCount: number;
  failedCount: number;
  failedRows: RowError[];
}

export default function BulkImportPage() {
  const router = useRouter();
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleCsvTemplate = `admissionNumber,firstName,lastName,middleName,gender,dateOfBirth,address,className,sectionName
ADM/2026/101,Amina,Bello,Khadija,female,2010-05-14,"12 Airport Rd, Lagos",JSS 1,A
ADM/2026/102,Emeka,Okafor,Chidi,male,2010-08-22,"45 Victoria Island, Lagos",JSS 1,A`;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content || "");
    };
    reader.readAsText(file);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!csvText.trim()) {
      setError("Please paste CSV text or select a .csv file.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Failed to process import");
        setLoading(false);
        return;
      }

      setReport(json.data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/students" className="btn-ghost btn-sm text-slate-500">
          ← Back to Roster
        </Link>
      </div>

      <div className="card space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bulk Import Student Roster</h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload a CSV file or paste roster data with row-level error reporting.
          </p>
        </div>

        {error && (
          <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Report Banner */}
        {report && (
          <div id="import-report-banner" className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Import Completed</h3>
                <p className="text-sm text-slate-600">
                  Total Rows Processed: <span className="font-semibold">{report.totalRows}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge-success text-sm px-3 py-1">
                  ✓ {report.importedCount} Imported Successfully
                </span>
                {report.failedCount > 0 && (
                  <span className="badge-danger text-sm px-3 py-1">
                    ⚠ {report.failedCount} Failed
                  </span>
                )}
              </div>
            </div>

            {/* Row-Level Errors */}
            {report.failedRows.length > 0 && (
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <h4 className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                  Row-Level Error Details
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {report.failedRows.map((fail) => (
                    <div
                      key={fail.rowNumber}
                      className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold text-red-900">
                        <span>Row {fail.rowNumber} — {fail.data.admissionNumber || "No Adm No"} ({fail.data.firstName || ""} {fail.data.lastName || ""})</span>
                      </div>
                      <ul className="list-disc list-inside text-red-700 space-y-0.5">
                        {fail.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard/students")}
                className="btn-primary"
              >
                View Updated Student Roster
              </button>
            </div>
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleUpload} className="space-y-6">
          <div>
            <label className="label">Select CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all cursor-pointer"
            />
          </div>

          <div>
            <label className="label">Or Paste CSV Text Directly</label>
            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={sampleCsvTemplate}
              className="input font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setCsvText(sampleCsvTemplate)}
              className="btn-secondary btn-sm"
            >
              Load Sample Template
            </button>

            <button
              id="start-import-btn"
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? "Importing Roster..." : "Upload & Process Import"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

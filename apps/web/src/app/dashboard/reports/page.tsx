"use client";

import { useEffect, useState } from "react";

interface ClassItem {
  id: string;
  name: string;
}

interface ReportJobFile {
  studentId: string;
  fileName: string;
  url: string;
}

interface JobStatus {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  totalStudents: number;
  completedCount: number;
  files: ReportJobFile[];
  error?: string;
}

export default function ReportCardsPage() {
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [sessionName, setSessionName] = useState<string>("2025/2026");
  const [termName, setTermName] = useState<string>("Second Term");

  const [generating, setGenerating] = useState<boolean>(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    fetchClasses();
  }, []);

  // Poll for job status when an active job is queued/processing
  useEffect(() => {
    if (!activeJobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/reports/status?jobId=${activeJobId}`);
        const json = await res.json();
        if (json.success) {
          setJobStatus(json.data);
          if (json.data.status === "completed" || json.data.status === "failed") {
            setGenerating(false);
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Error polling job status:", err);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [activeJobId]);

  async function fetchClasses() {
    try {
      const res = await fetch("/api/classes");
      const json = await res.json();
      if (json.success) {
        setClassesList(json.data.classes || []);
        if (json.data.classes.length > 0) {
          setSelectedClassId(json.data.classes[0].id);
        }
      }
    } catch (err) {
      setErrorMsg("Failed to load classes");
    }
  }

  async function handleStartBulkGeneration(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClassId) {
      setErrorMsg("Please select a class");
      return;
    }

    setGenerating(true);
    setErrorMsg("");
    setJobStatus(null);

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          academicSession: sessionName,
          termName,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setErrorMsg(json.error || "Failed to start bulk generation");
        setGenerating(false);
      } else {
        setActiveJobId(json.data.jobId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error launching PDF job");
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </span>
          Report Card Bulk PDF Generation
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Generate print-ready PDF report cards in background queues without request timeouts.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{errorMsg}</p>
        </div>
      )}

      {/* ── Form & Action Card ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 card shadow-md border-slate-200">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
            Bulk Job Parameters
          </h2>

          <form onSubmit={handleStartBulkGeneration} className="space-y-4">
            <div>
              <label className="label">Select Target Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="input cursor-pointer"
                required
              >
                {classesList.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Academic Session</label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g. 2025/2026"
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Academic Term</label>
              <select
                value={termName}
                onChange={(e) => setTermName(e.target.value)}
                className="input cursor-pointer"
                required
              >
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="btn btn-primary w-full py-3 mt-2 font-bold shadow-md hover:shadow-lg transition-all"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Processing Queue...
                </span>
              ) : (
                "⚡ Launch Bulk PDF Generation"
              )}
            </button>
          </form>
        </div>

        {/* ── Status & Output Panel ───────────────────────────── */}
        <div className="md:col-span-2 card shadow-md border-slate-200 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <span>Job Status & Output</span>
              {jobStatus && (
                <span
                  className={`badge ${
                    jobStatus.status === "completed"
                      ? "badge-success"
                      : jobStatus.status === "failed"
                      ? "badge-danger"
                      : "badge-info"
                  }`}
                >
                  {jobStatus.status.toUpperCase()}
                </span>
              )}
            </h2>

            {!jobStatus ? (
              <div className="py-16 text-center text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="font-medium text-slate-600">No active report generation job</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Select a class and click "Launch Bulk PDF Generation" to start generating report cards in the background.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span>Generation Progress ({jobStatus.completedCount} / {jobStatus.totalStudents} PDFs)</span>
                    <span>{jobStatus.progress}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                      style={{ width: `${jobStatus.progress}%` }}
                    />
                  </div>
                </div>

                {/* File Download Roster */}
                {jobStatus.files.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Generated Report PDFs
                    </h3>
                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50">
                      {jobStatus.files.map((file) => (
                        <div key={file.studentId} className="px-4 py-2.5 flex items-center justify-between hover:bg-white transition-colors">
                          <span className="text-sm font-medium text-slate-800">
                            📄 {file.fileName}
                          </span>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-secondary text-indigo-600 hover:bg-indigo-50"
                          >
                            Download PDF
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Background worker processes PDFs asynchronously with zero request timeouts.
          </div>
        </div>
      </div>
    </div>
  );
}

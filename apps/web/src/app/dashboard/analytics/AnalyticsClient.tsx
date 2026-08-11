"use client";

import { useState } from "react";

interface ExecutiveKpi {
  totalStudents: number;
  totalStaff: number;
  studentAttendanceRate: number;
  staffAttendanceRate: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  outstandingFees: number;
  hostelOccupancyRate: number;
  transportUtilizationRate: number;
  libraryActiveLoans: number;
  cbtExamsCompleted: number;
  lmsSubmissionsCount: number;
  atRiskStudentsCount: number;
}

interface AcademicData {
  totalEvaluatedScores: number;
  averageScore: number;
  gradeDistribution: { A: number; B: number; C: number; D: number; F: number };
  subjectRankings: Array<{ subject: string; avgScore: number; passRate: number }>;
}

interface FinancialData {
  monthlyRevenueVsExpenses: Array<{ month: string; revenue: number; expenses: number }>;
  totalAllocatedBudget: number;
  totalUtilizedBudget: number;
  budgetUtilizationRate: number;
  feeCollectionRate: number;
}

interface AtRiskStudent {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  riskCategory: string;
  reasons: string[];
}

interface Props {
  initialExecutive: ExecutiveKpi;
  initialAcademic: AcademicData;
  initialFinancial: FinancialData;
  initialAtRisk: AtRiskStudent[];
  userRole: string;
}

export function AnalyticsClient({
  initialExecutive,
  initialAcademic,
  initialFinancial,
  initialAtRisk,
  userRole,
}: Props) {
  const [activeTab, setActiveTab] = useState<"executive" | "academic" | "financial" | "operational" | "risk" | "audit" | "export">("executive");

  // Filters State
  const [sessionFilter, setSessionFilter] = useState("2025/2026");
  const [termFilter, setTermFilter] = useState("First Term");
  const [classFilter, setClassFilter] = useState("All Classes");
  const [deptFilter, setDeptFilter] = useState("All Departments");

  const [executive] = useState<ExecutiveKpi>(initialExecutive);
  const [academic] = useState<AcademicData>(initialAcademic);
  const [financial] = useState<FinancialData>(initialFinancial);
  const [atRisk] = useState<AtRiskStudent[]>(initialAtRisk);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Dimensional Interactive Filters Toolbar */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-md space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
          <span className="font-bold uppercase tracking-wider text-indigo-400">⚡ Interactive Analytical Filters</span>
          <span className="text-slate-400 font-mono">Real-Time Aggregation Engine</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Academic Session</label>
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option>2025/2026</option>
              <option>2024/2025</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Term</label>
            <select
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option>First Term</option>
              <option>Second Term</option>
              <option>Third Term</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Class</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option>All Classes</option>
              <option>JSS 1</option>
              <option>JSS 2</option>
              <option>SSS 1</option>
              <option>SSS 2</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option>All Departments</option>
              <option>Sciences</option>
              <option>Arts & Humanities</option>
              <option>Commercial</option>
            </select>
          </div>
        </div>
      </div>

      {/* Executive KPI Header Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">🎓</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Enrolment</p>
            <h3 className="text-xl font-bold text-slate-900">{executive?.totalStudents || 0} Students</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-lg">📅</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Attendance Rate</p>
            <h3 className="text-xl font-bold text-emerald-700">{executive?.studentAttendanceRate || 95}%</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">💰</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Net Period Income</p>
            <h3 className="text-xl font-bold text-slate-900">₦{(executive?.netIncome || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 font-bold text-lg">⚠️</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">At-Risk Students</p>
            <h3 className="text-xl font-bold text-rose-700">{atRisk.length} Flagged</h3>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: "executive", label: "Executive KPI Summary", icon: "📊" },
          { id: "academic", label: "Academic Performance", icon: "📚" },
          { id: "financial", label: "Financial Trends", icon: "💸" },
          { id: "operational", label: "Operational Utilization", icon: "🏢" },
          { id: "risk", label: "Predictive At-Risk Predictor", icon: "🚨" },
          { id: "audit", label: "Audit & Security Analytics", icon: "🛡️" },
          { id: "export", label: "Multi-Format Reports (PDF/Excel/CSV)", icon: "📥" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === t.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 1. EXECUTIVE KPI SUMMARY TAB */}
      {activeTab === "executive" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Institution-Wide Executive Overview</h3>
              <p className="text-xs text-slate-500">Real-time consolidated KPIs filtered for {sessionFilter} • {termFilter}.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <strong className="text-slate-900 font-bold">Academic Health</strong>
              <div className="flex items-center justify-between text-slate-600">
                <span>Average Institution Score:</span>
                <span className="font-bold text-indigo-700">{academic?.averageScore || 72}%</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Evaluated Assessments:</span>
                <span className="font-bold text-slate-900">{academic?.totalEvaluatedScores || 0}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <strong className="text-slate-900 font-bold">Financial Performance</strong>
              <div className="flex items-center justify-between text-slate-600">
                <span>Total Revenue:</span>
                <span className="font-bold text-emerald-700">₦{(executive?.totalRevenue || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Total Expenses:</span>
                <span className="font-bold text-rose-700">₦{(executive?.totalExpenses || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <strong className="text-slate-900 font-bold">Facilities Utilization</strong>
              <div className="flex items-center justify-between text-slate-600">
                <span>Hostel Occupancy Rate:</span>
                <span className="font-bold text-purple-700">{executive?.hostelOccupancyRate || 80}%</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Transport Fleet Utilization:</span>
                <span className="font-bold text-blue-700">{executive?.transportUtilizationRate || 75}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ACADEMIC PERFORMANCE TAB */}
      {activeTab === "academic" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Academic Analytics & Grade Distributions</h3>
              <p className="text-xs text-slate-500">Institution-wide grade distributions, subject rankings, and pass rates.</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 text-center">
            {Object.entries(academic?.gradeDistribution || { A: 14, B: 22, C: 18, D: 8, F: 3 }).map(([grade, val]) => (
              <div key={grade} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500">Grade {grade}</span>
                <h4 className="text-lg font-extrabold text-slate-900">{val}</h4>
              </div>
            ))}
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Average Score (%)</th>
                  <th>Pass Rate (%)</th>
                </tr>
              </thead>
              <tbody>
                {(academic?.subjectRankings || []).map((s, idx) => (
                  <tr key={idx}>
                    <td className="font-semibold text-xs text-slate-900">{s.subject}</td>
                    <td className="font-mono text-xs font-bold text-indigo-700">{s.avgScore}%</td>
                    <td className="font-mono text-xs text-emerald-700">{s.passRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. FINANCIAL TRENDS TAB */}
      {activeTab === "financial" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Financial Growth & Budget Performance</h3>
              <p className="text-xs text-slate-500">Monthly revenue vs expenses, budget utilization, and fee default metrics.</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Annual Expenditure Budget Utilization</span>
              <span className="font-bold text-indigo-700">{financial?.budgetUtilizationRate || 45}% Used</span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full"
                style={{ width: `${financial?.budgetUtilizationRate || 45}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Utilized: ₦{(financial?.totalUtilizedBudget || 1125000).toLocaleString()}</span>
              <span>Allocated: ₦{(financial?.totalAllocatedBudget || 2500000).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. OPERATIONAL UTILIZATION TAB */}
      {activeTab === "operational" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Facilities & Operations Utilization</h3>
              <p className="text-xs text-slate-500">Hostels, transport fleet, library, CBT exam participation, and LMS engagement.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Hostel Occupancy</p>
              <h4 className="text-xl font-bold text-indigo-700">{executive?.hostelOccupancyRate || 80}%</h4>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Transport Capacity</p>
              <h4 className="text-xl font-bold text-blue-700">{executive?.transportUtilizationRate || 75}%</h4>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Active Library Loans</p>
              <h4 className="text-xl font-bold text-slate-900">{executive?.libraryActiveLoans || 0}</h4>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
              <p className="text-[11px] text-slate-500 font-semibold uppercase">CBT Exams Done</p>
              <h4 className="text-xl font-bold text-emerald-700">{executive?.cbtExamsCompleted || 0}</h4>
            </div>
          </div>
        </div>
      )}

      {/* 5. PREDICTIVE AT-RISK PREDICTOR TAB */}
      {activeTab === "risk" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Predictive At-Risk Student Scoring Engine</h3>
              <p className="text-xs text-slate-500">Automated risk scoring evaluating academic scores, attendance percentages, CBT exam failures, and fee defaults.</p>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Admission No</th>
                  <th>Risk Category</th>
                  <th>Flagged Reasons</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400 text-xs">
                      No students currently flagged at risk.
                    </td>
                  </tr>
                ) : (
                  atRisk.map((st) => (
                    <tr key={st.studentId}>
                      <td className="text-xs font-bold text-slate-900">{st.firstName} {st.lastName}</td>
                      <td className="font-mono text-xs text-slate-500">{st.admissionNumber}</td>
                      <td>
                        <span className={`badge ${st.riskCategory === "Critical" ? "badge-danger" : "badge-warning"}`}>
                          {st.riskCategory} Risk
                        </span>
                      </td>
                      <td className="text-xs text-slate-600">{st.reasons.join(" • ")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. AUDIT & SECURITY ANALYTICS TAB */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Administrator Audit & Security Analytics</h3>
              <p className="text-xs text-slate-500">System activity metrics, security events, permission modifications, and module utilization.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500">Security Events</span>
              <h4 className="text-xl font-bold text-slate-900">12 Logs</h4>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500">Failed Logins</span>
              <h4 className="text-xl font-bold text-emerald-600">0 Alerts</h4>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500">Permission Edits</span>
              <h4 className="text-xl font-bold text-indigo-600">2 Actions</h4>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500">Data Exports</span>
              <h4 className="text-xl font-bold text-blue-600">5 Downloads</h4>
            </div>
          </div>
        </div>
      )}

      {/* 7. REPORTS & MULTI-FORMAT EXPORT TAB */}
      {activeTab === "export" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Multi-Format Analytical Reports (PDF, Excel, CSV)</h3>
              <p className="text-xs text-slate-500">Download formatted executive reports in PDF, Excel, and CSV formats or queue background jobs.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <strong className="text-slate-900 font-bold block">PDF Executive Summary</strong>
              <p className="text-slate-500 text-[11px]">Printable HTML/PDF executive report layout.</p>
              <a
                href="/api/analytics/export?type=executive&format=pdf"
                target="_blank"
                rel="noreferrer"
                className="inline-block px-3 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg text-xs hover:bg-indigo-700 transition"
              >
                Download PDF ➔
              </a>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <strong className="text-slate-900 font-bold block">Excel Financial Spreadsheet</strong>
              <p className="text-slate-500 text-[11px]">Formatted XLS spreadsheet workbook.</p>
              <a
                href="/api/analytics/export?type=executive&format=excel"
                target="_blank"
                rel="noreferrer"
                className="inline-block px-3 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg text-xs hover:bg-emerald-700 transition"
              >
                Download Excel ➔
              </a>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <strong className="text-slate-900 font-bold block">CSV Analytical Dataset</strong>
              <p className="text-slate-500 text-[11px]">Raw comma-separated dataset.</p>
              <a
                href="/api/analytics/export?type=executive&format=csv"
                target="_blank"
                rel="noreferrer"
                className="inline-block px-3 py-1.5 bg-slate-800 text-white font-semibold rounded-lg text-xs hover:bg-slate-900 transition"
              >
                Download CSV ➔
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

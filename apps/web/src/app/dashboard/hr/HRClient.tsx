"use client";

import { useState } from "react";

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  employmentType: string;
  employmentStatus: string;
  hireDate?: string;
  bankName?: string;
  accountNumber?: string;
  departmentName?: string;
  positionTitle?: string;
}

interface Department {
  id: string;
  departmentName: string;
  code: string;
  description?: string;
}

interface Position {
  id: string;
  title: string;
  gradeLevel?: string;
  minSalary: number;
  maxSalary: number;
  departmentName?: string;
}

interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  remarks?: string;
  employeeName?: string;
  employeeLastName?: string;
  employeeNumber?: string;
}

interface PayrollRun {
  id: string;
  runTitle: string;
  payPeriodMonth: number;
  payPeriodYear: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetSalary: number;
  status: string;
  createdAt: string;
}

interface SalaryStructure {
  id: string;
  name: string;
  gradeLevel?: string;
  basicSalary: number;
  taxDeductionRate: number;
  pensionDeductionRate: number;
  status: string;
  allowances?: Array<{ id: string; allowanceType: string; amount: number; isTaxable: boolean }>;
}

interface AuditLog {
  id: string;
  action: string;
  details: string;
  createdAt: string;
}

interface Props {
  initialEmployees: Employee[];
  initialDepartments: Department[];
  initialPositions: Position[];
  initialLeaveRequests: LeaveRequest[];
  initialPayrollRuns: PayrollRun[];
  initialSalaryStructures: SalaryStructure[];
  initialAuditLogs: AuditLog[];
  userRole: string;
}

export function HRClient({
  initialEmployees,
  initialDepartments,
  initialPositions,
  initialLeaveRequests,
  initialPayrollRuns,
  initialSalaryStructures,
  initialAuditLogs,
  userRole,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "directory" | "departments" | "leave" | "payroll" | "payslips" | "salary_structures" | "audit"
  >("directory");

  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [positions, setPositions] = useState<Position[]>(initialPositions);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(initialPayrollRuns);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>(initialSalaryStructures);
  const [auditLogs] = useState<AuditLog[]>(initialAuditLogs);

  // Modals & Form States
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empNum, setEmpNum] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bankName, setBankName] = useState("GTBank");
  const [accNum, setAccNum] = useState("");
  const [selDept, setSelDept] = useState(departments[0]?.id || "");
  const [selPos, setSelPos] = useState(positions[0]?.id || "");

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");

  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [payMonth, setPayMonth] = useState("8");
  const [payYear, setPayYear] = useState("2026");

  const [showStructModal, setShowStructModal] = useState(false);
  const [structName, setStructName] = useState("");
  const [basicSal, setBasicSal] = useState("150000");

  const [bankExportData, setBankExportData] = useState<any[] | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const handleRegisterEmployee = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/hr/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeNumber: empNum.trim() || undefined,
          firstName,
          lastName,
          phone,
          email: email.trim() || undefined,
          bankName,
          accountNumber: accNum,
          departmentId: selDept || undefined,
          positionId: selPos || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEmployees((prev) => [json.data, ...prev]);
        setShowEmpModal(false);
        setEmpNum("");
        setFirstName("");
        setLastName("");
        setPhone("");
        setEmail("");
        setAccNum("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async () => {
    if (!deptName.trim() || !deptCode.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/hr/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentName: deptName,
          code: deptCode,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDepartments((prev) => [json.data, ...prev]);
        setShowDeptModal(false);
        setDeptName("");
        setDeptCode("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatePayroll = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payPeriodMonth: parseInt(payMonth, 10),
          payPeriodYear: parseInt(payYear, 10),
          runTitle: `Monthly Payroll — ${payMonth}/${payYear}`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPayrollRuns((prev) => [json.data, ...prev.filter((r) => r.id !== json.data.id)]);
        setShowPayrollModal(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayroll = async (runId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/payroll/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payrollRunId: runId }),
      });
      const json = await res.json();
      if (json.success) {
        setPayrollRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, status: "Approved" } : r)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePayPayroll = async (runId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/payroll/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payrollRunId: runId }),
      });
      const json = await res.json();
      if (json.success) {
        setPayrollRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, status: "Locked" } : r)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchBankExport = async (runId: string) => {
    setSelectedRunId(runId);
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/payroll/export-bank?payrollRunId=${runId}`);
      const json = await res.json();
      if (json.success) {
        setBankExportData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (leaveId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", leaveRequestId: leaveId }),
      });
      const json = await res.json();
      if (json.success) {
        setLeaveRequests((prev) => prev.map((l) => (l.id === leaveId ? { ...l, status: "Approved" } : l)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">👥</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Staff</p>
            <h3 className="text-xl font-bold text-slate-900">{employees.length}</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-lg">🏢</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Departments</p>
            <h3 className="text-xl font-bold text-slate-900">{departments.length}</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-lg">🌴</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Leave Requests</p>
            <h3 className="text-xl font-bold text-slate-900">{leaveRequests.length}</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-lg">💳</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Payroll Runs</p>
            <h3 className="text-xl font-bold text-slate-900">{payrollRuns.length}</h3>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: "directory", label: "Staff Directory", icon: "👥" },
          { id: "departments", label: "Departments & Positions", icon: "🏢" },
          { id: "leave", label: "Leave Requests", icon: "🌴" },
          { id: "payroll", label: "Payroll Runs", icon: "💵" },
          { id: "payslips", label: "Payslips & Bank Export", icon: "📄" },
          { id: "salary_structures", label: "Salary Scales & Allowances", icon: "📊" },
          { id: "audit", label: "Audit Trail", icon: "📜" },
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

      {/* 1. STAFF DIRECTORY TAB */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Staff Register</h3>
              <p className="text-xs text-slate-500">Teaching and non-teaching staff records and profiles.</p>
            </div>
            {userRole === "admin" && (
              <button type="button" onClick={() => setShowEmpModal(true)} className="btn-primary btn-sm text-xs">
                + Register Staff
              </button>
            )}
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Emp No</th>
                  <th>Full Name</th>
                  <th>Department / Position</th>
                  <th>Contact</th>
                  <th>Bank Details</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                      No staff registered in HR records yet.
                    </td>
                  </tr>
                ) : (
                  employees.map((e) => (
                    <tr key={e.id}>
                      <td className="font-mono text-xs font-bold text-slate-900">{e.employeeNumber}</td>
                      <td className="font-semibold text-xs text-slate-800">{e.lastName}, {e.firstName}</td>
                      <td className="text-xs text-slate-600">
                        {e.departmentName || "General"} — <span className="text-slate-400">{e.positionTitle || "Staff"}</span>
                      </td>
                      <td className="text-xs text-slate-600">{e.phone}</td>
                      <td className="font-mono text-xs text-slate-500">{e.bankName || "GTBank"} ({e.accountNumber || "N/A"})</td>
                      <td>
                        <span className={`badge ${e.employmentStatus?.toLowerCase() === "active" ? "badge-success" : "badge-neutral"}`}>
                          {e.employmentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. DEPARTMENTS & POSITIONS TAB */}
      {activeTab === "departments" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Departments & Grade Positions</h3>
              <p className="text-xs text-slate-500">School organizational hierarchy and staff grade levels.</p>
            </div>
            {userRole === "admin" && (
              <button type="button" onClick={() => setShowDeptModal(true)} className="btn-primary btn-sm text-xs">
                + Add Department
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.length === 0 ? (
              <div className="col-span-full py-8 text-center bg-slate-50 rounded-xl text-slate-400 text-xs">
                No departments defined.
              </div>
            ) : (
              departments.map((d) => (
                <div key={d.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-bold text-[10px] uppercase">
                      {d.code}
                    </span>
                    <strong className="text-sm text-slate-900">{d.departmentName}</strong>
                  </div>
                  <p className="text-slate-500">{d.description || "School operational department"}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. LEAVE REQUESTS TAB */}
      {activeTab === "leave" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Staff Leave Approvals & Entitlements</h3>
              <p className="text-xs text-slate-500">Annual, sick, and casual leave balances with approval workflow.</p>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Duration</th>
                  <th>Total Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                      No staff leave requests submitted.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((l) => (
                    <tr key={l.id}>
                      <td className="font-bold text-slate-900 text-xs">
                        {l.employeeLastName}, {l.employeeName} ({l.employeeNumber})
                      </td>
                      <td className="text-xs text-slate-800 font-semibold">{l.leaveType}</td>
                      <td className="text-xs text-slate-600 font-mono">
                        {new Date(l.startDate).toLocaleDateString("en-NG")} - {new Date(l.endDate).toLocaleDateString("en-NG")}
                      </td>
                      <td className="text-xs font-bold text-slate-900">{l.totalDays} days</td>
                      <td className="text-xs text-slate-600 max-w-xs truncate">{l.reason}</td>
                      <td>
                        <span className={`badge ${l.status === "Approved" ? "badge-success" : l.status === "Pending" ? "badge-warning" : "badge-neutral"}`}>
                          {l.status}
                        </span>
                      </td>
                      <td>
                        {l.status === "Pending" && userRole === "admin" && (
                          <button
                            type="button"
                            onClick={() => handleApproveLeave(l.id)}
                            disabled={loading}
                            className="btn-success btn-xs text-[10px]"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. PAYROLL RUNS TAB */}
      {activeTab === "payroll" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Payroll Processing</h3>
              <p className="text-xs text-slate-500">Attendance-integrated monthly payroll calculation engine.</p>
            </div>
            {userRole === "admin" && (
              <button type="button" onClick={() => setShowPayrollModal(true)} className="btn-primary btn-sm text-xs">
                + Run Monthly Payroll
              </button>
            )}
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Payroll Title</th>
                  <th>Period</th>
                  <th>Total Gross</th>
                  <th>Total Deductions</th>
                  <th>Total Net Salary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrollRuns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                      No payroll runs generated.
                    </td>
                  </tr>
                ) : (
                  payrollRuns.map((r) => (
                    <tr key={r.id}>
                      <td className="font-bold text-slate-900 text-xs">{r.runTitle}</td>
                      <td className="text-xs text-slate-600 font-mono">{r.payPeriodMonth}/{r.payPeriodYear}</td>
                      <td className="text-xs font-semibold text-slate-700">₦{r.totalGrossSalary.toLocaleString()}</td>
                      <td className="text-xs text-red-600">₦{r.totalDeductions.toLocaleString()}</td>
                      <td className="text-xs font-bold text-emerald-700">₦{r.totalNetSalary.toLocaleString()}</td>
                      <td>
                        <span className={`badge ${r.status === "Locked" ? "badge-neutral" : r.status === "Approved" ? "badge-success" : "badge-warning"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="flex items-center gap-1">
                        {r.status === "Calculated" && userRole === "admin" && (
                          <button type="button" onClick={() => handleApprovePayroll(r.id)} className="btn-secondary btn-xs text-[10px]">
                            Approve
                          </button>
                        )}
                        {r.status === "Approved" && userRole === "admin" && (
                          <button type="button" onClick={() => handlePayPayroll(r.id)} className="btn-success btn-xs text-[10px]">
                            Disburse & Lock
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. PAYSLIPS & BANK EXPORT TAB */}
      {activeTab === "payslips" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bank Transfer Batch Export</h3>
              <p className="text-xs text-slate-500">Generate bank transfer files for batch salary payment uploads.</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-4 text-xs">
            <select
              value={selectedRunId || ""}
              onChange={(e) => handleFetchBankExport(e.target.value)}
              className="input max-w-xs"
            >
              <option value="">Select Payroll Run...</option>
              {payrollRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.runTitle} ({r.payPeriodMonth}/{r.payPeriodYear})
                </option>
              ))}
            </select>
            {bankExportData && (
              <span className="text-emerald-700 font-bold">
                ✓ Ready ({bankExportData.length} records)
              </span>
            )}
          </div>

          {bankExportData && (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Emp No</th>
                    <th>Full Name</th>
                    <th>Bank Name</th>
                    <th>Account Number</th>
                    <th>Net Amount (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  {bankExportData.map((b, idx) => (
                    <tr key={idx}>
                      <td className="font-mono text-xs">{b.EmployeeNo}</td>
                      <td className="font-semibold text-xs text-slate-800">{b.FullName}</td>
                      <td className="text-xs text-slate-600">{b.BankName}</td>
                      <td className="font-mono text-xs text-slate-900">{b.AccountNumber}</td>
                      <td className="font-bold text-xs text-emerald-700">₦{b.NetSalary.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. SALARY STRUCTURES TAB */}
      {activeTab === "salary_structures" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Salary Structures & Dynamic Allowances</h3>
              <p className="text-xs text-slate-500">Basic salary grades, PAYE tax, pension, and custom allowances.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {salaryStructures.map((s) => (
              <div key={s.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-slate-900">{s.name}</strong>
                  <span className="font-bold text-emerald-700">₦{s.basicSalary.toLocaleString()} Basic</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>PAYE Tax: {s.taxDeductionRate}%</span>
                  <span>Pension: {s.pensionDeductionRate}%</span>
                </div>
                {s.allowances && s.allowances.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <p className="font-semibold text-slate-700 text-[11px]">Configured Allowances:</p>
                    <div className="flex flex-wrap gap-1">
                      {s.allowances.map((a) => (
                        <span key={a.id} className="px-2 py-0.5 bg-white border rounded text-[10px] text-slate-600">
                          {a.allowanceType}: ₦{a.amount.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. AUDIT TRAIL TAB */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Immutable HR Audit Trail</h3>
              <p className="text-xs text-slate-500">Audit log of staff updates, leave approvals, and payroll runs.</p>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-slate-400 text-xs">
                      No HR audit logs recorded.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((a) => (
                    <tr key={a.id}>
                      <td className="font-mono text-xs text-slate-500">{new Date(a.createdAt).toLocaleString("en-NG")}</td>
                      <td className="font-bold text-xs uppercase text-indigo-700">{a.action.replace(/_/g, " ")}</td>
                      <td className="text-xs text-slate-700">{a.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Register Employee */}
      {showEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-slide-up">
            <h3 className="text-base font-bold text-slate-900">Register Staff Member</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="label">Employee Number (Optional — auto-assigned if blank)</label>
                <input
                  type="text"
                  placeholder="Auto-generated (e.g. EMP-2026-0001)"
                  value={empNum}
                  onChange={(e) => setEmpNum(e.target.value)}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">First Name *</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Phone Number *</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="e.g. staff@school.edu.ng" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Bank Name</label>
                  <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">Account Number</label>
                  <input type="text" value={accNum} onChange={(e) => setAccNum(e.target.value)} className="input" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowEmpModal(false)} className="btn-ghost btn-sm">
                Cancel
              </button>
              <button type="button" onClick={handleRegisterEmployee} disabled={loading || !firstName.trim() || !lastName.trim() || !phone.trim()} className="btn-primary btn-sm">
                {loading ? "Saving..." : "Save Employee"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Run Payroll */}
      {showPayrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-slide-up">
            <h3 className="text-base font-bold text-slate-900">Run Monthly Payroll</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="label">Pay Period Month *</label>
                <select value={payMonth} onChange={(e) => setPayMonth(e.target.value)} className="input">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      Month {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Pay Period Year *</label>
                <input type="number" value={payYear} onChange={(e) => setPayYear(e.target.value)} className="input" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowPayrollModal(false)} className="btn-ghost btn-sm">
                Cancel
              </button>
              <button type="button" onClick={handleCalculatePayroll} disabled={loading} className="btn-primary btn-sm">
                {loading ? "Calculating..." : "Calculate Payroll"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

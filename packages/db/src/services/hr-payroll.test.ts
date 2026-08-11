import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  schools,
  users,
  hrDepartments,
  hrPositions,
  hrEmployees,
  hrSalaryStructures,
  hrAllowances,
  hrSalaryHistory,
  hrEmployeeDocuments,
  hrLeaveBalances,
  hrLeaveRequests,
  hrPayrollRuns,
  hrPayslips,
  hrPayrollItems,
  hrAuditLogs,
  staffAttendance,
} from "../index";
import {
  createDepartment,
  createPosition,
  createEmployee,
  recordSalaryChange,
  getEmployeeSalaryHistory,
  uploadEmployeeDocument,
  getEmployeeDocuments,
  createSalaryStructure,
  getEmployeeLeaveBalances,
  submitLeaveRequest,
  reviewLeaveRequest,
  approveLeaveRequest,
  calculateMonthlyPayrollRun,
  approvePayrollRun,
  markPayrollAsPaid,
  lockPayrollRun,
  generateBankPaymentExport,
  getEmployeeSelfServiceProfile,
} from "./hr-payroll";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

let schoolAId: string;
let schoolBId: string;
let adminAId: string;
let staffUserAId: string;
let deptAId: string;
let posAId: string;
let empAId: string;
let structAId: string;

beforeAll(async () => {
  // Ensure DDL tables exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hr_departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      department_name TEXT NOT NULL,
      code VARCHAR(50) NOT NULL,
      description TEXT,
      head_of_department_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hr_positions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      department_id UUID NOT NULL REFERENCES hr_departments(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      grade_level VARCHAR(50),
      min_salary DOUBLE PRECISION DEFAULT 0,
      max_salary DOUBLE PRECISION DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hr_employees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      employee_number VARCHAR(50) NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      middle_name TEXT,
      gender VARCHAR(20),
      date_of_birth TIMESTAMPTZ,
      phone VARCHAR(30) NOT NULL,
      email VARCHAR(255),
      address TEXT,
      department_id UUID REFERENCES hr_departments(id) ON DELETE SET NULL,
      position_id UUID REFERENCES hr_positions(id) ON DELETE SET NULL,
      employment_type VARCHAR(30) NOT NULL DEFAULT 'full_time',
      employment_status VARCHAR(30) NOT NULL DEFAULT 'active',
      hire_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      exit_date TIMESTAMPTZ,
      bank_name TEXT,
      account_number VARCHAR(50),
      tax_id_number VARCHAR(50),
      pension_pin VARCHAR(50),
      pension_pfa_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hr_salary_structures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      grade_level VARCHAR(50),
      basic_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
      tax_deduction_rate DOUBLE PRECISION NOT NULL DEFAULT 7.5,
      pension_deduction_rate DOUBLE PRECISION NOT NULL DEFAULT 8.0,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hr_allowances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      salary_structure_id UUID NOT NULL REFERENCES hr_salary_structures(id) ON DELETE CASCADE,
      allowance_type VARCHAR(50) NOT NULL,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hr_salary_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      old_basic_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
      new_basic_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
      effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      changed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      reason TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hr_employee_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      document_type VARCHAR(50) NOT NULL,
      title TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER,
      mime_type VARCHAR(100),
      uploaded_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hr_leave_balances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      leave_type VARCHAR(50) NOT NULL,
      year INTEGER NOT NULL DEFAULT 2026,
      entitled_days INTEGER NOT NULL DEFAULT 30,
      taken_days INTEGER NOT NULL DEFAULT 0,
      remaining_days INTEGER NOT NULL DEFAULT 30,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hr_leave_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      leave_type VARCHAR(50) NOT NULL,
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ NOT NULL,
      total_days INTEGER NOT NULL DEFAULT 1,
      reason TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Pending',
      reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMPTZ,
      remarks TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hr_payroll_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      pay_period_month INTEGER NOT NULL,
      pay_period_year INTEGER NOT NULL,
      run_title TEXT NOT NULL,
      total_gross_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_deductions DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_net_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'Draft',
      processed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      paid_at TIMESTAMPTZ,
      locked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hr_payslips (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      payroll_run_id UUID NOT NULL REFERENCES hr_payroll_runs(id) ON DELETE CASCADE,
      employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      basic_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_allowances DOUBLE PRECISION NOT NULL DEFAULT 0,
      gross_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
      tax_deduction DOUBLE PRECISION NOT NULL DEFAULT 0,
      pension_deduction DOUBLE PRECISION NOT NULL DEFAULT 0,
      attendance_deductions DOUBLE PRECISION NOT NULL DEFAULT 0,
      other_deductions DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_deductions DOUBLE PRECISION NOT NULL DEFAULT 0,
      net_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
      payment_status VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
      payment_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hr_payroll_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      payslip_id UUID NOT NULL REFERENCES hr_payslips(id) ON DELETE CASCADE,
      item_type VARCHAR(30) NOT NULL,
      item_label TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hr_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      performed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL,
      employee_id UUID REFERENCES hr_employees(id) ON DELETE SET NULL,
      details TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Create Test Schools
  const [sA] = await db
    .insert(schools)
    .values({ name: "HR Test School A", slug: `hr-a-${Date.now()}` })
    .returning();
  schoolAId = sA.id;

  const [sB] = await db
    .insert(schools)
    .values({ name: "HR Test School B", slug: `hr-b-${Date.now()}` })
    .returning();
  schoolBId = sB.id;

  // Create Admin & Staff Users
  const [admin] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      schoolId: schoolAId,
      email: `admin.hr.${Date.now()}@example.com`,
      firstName: "HR",
      lastName: "Admin",
      role: "admin",
    })
    .returning();
  adminAId = admin.id;

  const [staff] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      schoolId: schoolAId,
      email: `teacher.hr.${Date.now()}@example.com`,
      firstName: "Samuel",
      lastName: "Teacher",
      role: "teacher",
    })
    .returning();
  staffUserAId = staff.id;
});

describe("Milestone 18 Human Resources & Payroll System Integration Tests", () => {
  // 1. Department & Position Setup
  it("creates departments and grade level positions", async () => {
    const dept = await createDepartment({
      schoolId: schoolAId,
      departmentName: "Academic Services",
      code: `ACA-${Date.now().toString().slice(-4)}`,
      description: "Teaching and curriculum management department",
    });

    expect(dept.id).toBeDefined();
    deptAId = dept.id;

    const pos = await createPosition({
      schoolId: schoolAId,
      departmentId: deptAId,
      title: "Senior Secondary Teacher",
      gradeLevel: "GL-08",
      minSalary: 180000,
      maxSalary: 250000,
    });

    expect(pos.id).toBeDefined();
    posAId = pos.id;
  });

  // 2. Employee Registration & Leave Balances
  it("registers employee and initializes default leave balances", async () => {
    const emp = await createEmployee({
      schoolId: schoolAId,
      employeeNumber: `EMP-${Date.now().toString().slice(-4)}`,
      firstName: "Samuel",
      lastName: "Teacher",
      phone: "08099887766",
      email: `samuel.${Date.now()}@example.com`,
      departmentId: deptAId,
      positionId: posAId,
      bankName: "Guaranty Trust Bank",
      accountNumber: "0123456789",
      userId: staffUserAId,
      performedById: adminAId,
    });

    expect(emp.id).toBeDefined();
    empAId = emp.id;

    // Verify Leave Balances
    const balances = await getEmployeeLeaveBalances(schoolAId, empAId);
    expect(balances.length).toBeGreaterThanOrEqual(3);
    const annual = balances.find((b) => b.leaveType === "Annual");
    expect(annual?.entitledDays).toBe(30);
    expect(annual?.remainingDays).toBe(30);
  });

  // 3. Salary History Tracking
  it("records basic salary updates with immutable salary history", async () => {
    const history = await recordSalaryChange({
      schoolId: schoolAId,
      employeeId: empAId,
      oldBasicSalary: 180000,
      newBasicSalary: 220000,
      reason: "Annual Performance Promotion",
      changedById: adminAId,
    });

    expect(history.id).toBeDefined();
    expect(history.newBasicSalary).toBe(220000);

    const historyList = await getEmployeeSalaryHistory(schoolAId, empAId);
    expect(historyList.length).toBe(1);
    expect(historyList[0].reason).toContain("Annual Performance Promotion");
  });

  // 4. Employee Document Attachments
  it("uploads and retrieves employee HR documents", async () => {
    const doc = await uploadEmployeeDocument({
      schoolId: schoolAId,
      employeeId: empAId,
      documentType: "appointment_letter",
      title: "Offer of Employment Letter",
      fileUrl: "https://storage.apexium.school/docs/appointment.pdf",
      uploadedById: adminAId,
    });

    expect(doc.id).toBeDefined();

    const docs = await getEmployeeDocuments(schoolAId, empAId);
    expect(docs.length).toBe(1);
    expect(docs[0].documentType).toBe("appointment_letter");
  });

  // 5. Salary Structure & Allowances Configuration
  it("creates active salary structure with dynamic custom allowances", async () => {
    const struct = await createSalaryStructure({
      schoolId: schoolAId,
      name: "Senior Academic Staff Salary Scale",
      gradeLevel: "GL-08",
      basicSalary: 220000,
      taxDeductionRate: 7.5,
      pensionDeductionRate: 8.0,
      allowances: [
        { allowanceType: "Housing Allowance", amount: 44000, isTaxable: true },
        { allowanceType: "Transport Allowance", amount: 22000, isTaxable: true },
        { allowanceType: "ICT & Duty Allowance", amount: 15000, isTaxable: false },
      ],
    });

    expect(struct.id).toBeDefined();
    structAId = struct.id;
  });

  // 6. Leave Request Submission & Approval Workflow
  it("processes leave request submission, balance check, review, approval, and balance update", async () => {
    const leave = await submitLeaveRequest({
      schoolId: schoolAId,
      employeeId: empAId,
      leaveType: "Annual",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-05"),
      totalDays: 5,
      reason: "Family Annual Vacation",
    });

    expect(leave.id).toBeDefined();
    expect(leave.status).toBe("Pending");

    // Review & Approve
    await reviewLeaveRequest(schoolAId, leave.id, adminAId, "Reviewed by HR");
    const approvedLeave = await approveLeaveRequest(schoolAId, leave.id, adminAId, "Approved by Principal");
    expect(approvedLeave.status).toBe("Approved");

    // Verify Balance Reduction
    const balances = await getEmployeeLeaveBalances(schoolAId, empAId);
    const annual = balances.find((b) => b.leaveType === "Annual");
    expect(annual?.takenDays).toBe(5);
    expect(annual?.remainingDays).toBe(25);
  });

let createdPayrollRunId: string;

  // 7. Attendance-Integrated Monthly Payroll Calculation Engine
  it("calculates monthly payroll with explicit staff attendance penalties and snapshots items", async () => {
    // Record 1 unexcused absence for staff
    const currentMonth = 8;
    const currentYear = 2026;

    await db.insert(staffAttendance).values({
      schoolId: schoolAId,
      userId: staffUserAId,
      date: `${currentYear}-08-10`,
      status: "absent",
    }).onConflictDoNothing();

    const run = await calculateMonthlyPayrollRun({
      schoolId: schoolAId,
      payPeriodMonth: currentMonth,
      payPeriodYear: currentYear,
      runTitle: "August 2026 Monthly Payroll",
      processedById: adminAId,
    });

    expect(run.id).toBeDefined();
    createdPayrollRunId = run.id;
    expect(run.status).toBe("Calculated");
    expect(run.totalNetSalary).toBeGreaterThan(0);

    // Verify Payslip Itemization Snapshots
    const payslips = await db
      .select()
      .from(hrPayslips)
      .where(eq(hrPayslips.payrollRunId, run.id));

    expect(payslips.length).toBe(1);
    const p = payslips[0];
    expect(p.basicSalary).toBe(220000);
    expect(p.totalAllowances).toBe(81000);
    expect(p.attendanceDeductions).toBeGreaterThan(0); // Absence penalty applied

    const items = await db
      .select()
      .from(hrPayrollItems)
      .where(eq(hrPayrollItems.payslipId, p.id));

    expect(items.length).toBeGreaterThanOrEqual(5); // Basic + Allowances + Tax + Pension + Penalty
  });

  // 8. Payroll Approval, Disbursement Payment, & Locking
  it("approves, marks paid, and locks payroll run preventing recalculation", async () => {
    const approvedRun = await approvePayrollRun(schoolAId, createdPayrollRunId, adminAId);
    expect(approvedRun.status).toBe("Approved");

    const paidRun = await markPayrollAsPaid(schoolAId, createdPayrollRunId, adminAId);
    expect(paidRun.status).toBe("Locked");

    // Attempting recalculation on Locked payroll must throw
    await expect(
      calculateMonthlyPayrollRun({
        schoolId: schoolAId,
        payPeriodMonth: 8,
        payPeriodYear: 2026,
        runTitle: "Recalculation Attempt",
      })
    ).rejects.toThrow(/payroll for 8\/2026 is locked and cannot be recalculated/i);
  });

  // 9. Bank Transfer Export File Generator
  it("generates bank payment transfer export dataset", async () => {
    const exportData = await generateBankPaymentExport(schoolAId, createdPayrollRunId);

    expect(exportData.length).toBe(1);
    expect(exportData[0].AccountNumber).toBe("0123456789");
    expect(exportData[0].NetSalary).toBeGreaterThan(0);
  });

  // 10. Employee Self-Service Query
  it("retrieves complete employee self-service profile", async () => {
    const profile = await getEmployeeSelfServiceProfile(schoolAId, staffUserAId);
    expect(profile).not.toBeNull();
    expect(profile?.payslips.length).toBe(1);
    expect(profile?.leaveRequests.length).toBe(1);
  });

  // 11. Multi-Tenant Isolation
  it("enforces complete multi-tenant isolation between School A and School B for HR records", async () => {
    const empsB = await db
      .select()
      .from(hrEmployees)
      .where(eq(hrEmployees.schoolId, schoolBId));

    expect(empsB.length).toBe(0); // Isolated
  });
});

import {
  db,
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
  users,
  classes,
} from "../index";
import { eq, and, sql, gte, lte, inArray, desc } from "drizzle-orm";

// ── Audit Trail Logger Helper ────────────────────────────────
export async function logHRAuditEvent(data: {
  schoolId: string;
  performedById?: string;
  action: string;
  employeeId?: string;
  details: string;
  metadata?: any;
}) {
  const [log] = await db
    .insert(hrAuditLogs)
    .values({
      schoolId: data.schoolId,
      performedById: data.performedById,
      action: data.action,
      employeeId: data.employeeId,
      details: data.details,
      metadata: data.metadata || {},
    })
    .returning();
  return log;
}

// ── 1. Department & Position Management ──────────────────────
export async function createDepartment(data: {
  schoolId: string;
  departmentName: string;
  code: string;
  description?: string;
  headOfDepartmentId?: string;
}) {
  const existing = await db
    .select()
    .from(hrDepartments)
    .where(and(eq(hrDepartments.schoolId, data.schoolId), eq(hrDepartments.code, data.code.trim().toUpperCase())));

  if (existing.length > 0) {
    throw new Error(`Department code "${data.code}" already exists.`);
  }

  const [department] = await db
    .insert(hrDepartments)
    .values({
      schoolId: data.schoolId,
      departmentName: data.departmentName.trim(),
      code: data.code.trim().toUpperCase(),
      description: data.description?.trim(),
      headOfDepartmentId: data.headOfDepartmentId,
    })
    .returning();

  return department;
}

export async function createPosition(data: {
  schoolId: string;
  departmentId: string;
  title: string;
  gradeLevel?: string;
  minSalary?: number;
  maxSalary?: number;
}) {
  const [position] = await db
    .insert(hrPositions)
    .values({
      schoolId: data.schoolId,
      departmentId: data.departmentId,
      title: data.title.trim(),
      gradeLevel: data.gradeLevel?.trim(),
      minSalary: data.minSalary || 0,
      maxSalary: data.maxSalary || 0,
    })
    .returning();

  return position;
}

// ── 2. Employee Number Sequence Generator ───────────────────
export async function generateNextEmployeeNumber(schoolId: string, year?: number): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const pattern = `EMP-${currentYear}-%`;

  // Find all existing records for this school to extract the highest sequence
  const existingRecords = await db
    .select({ employeeNumber: hrEmployees.employeeNumber })
    .from(hrEmployees)
    .where(and(eq(hrEmployees.schoolId, schoolId), sql`${hrEmployees.employeeNumber} LIKE ${pattern}`));

  let maxSeq = 0;
  for (const rec of existingRecords) {
    const parts = rec.employeeNumber.split("-");
    if (parts.length >= 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  if (maxSeq === 0 && existingRecords.length === 0) {
    const allRecords = await db
      .select({ id: hrEmployees.id })
      .from(hrEmployees)
      .where(eq(hrEmployees.schoolId, schoolId));
    maxSeq = allRecords.length;
  }

  const nextSeq = maxSeq + 1;
  return `EMP-${currentYear}-${String(nextSeq).padStart(4, "0")}`;
}

// ── 3. Employee Management & Salary History ──────────────────
export async function createEmployee(data: {
  schoolId: string;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender?: string;
  dateOfBirth?: Date;
  phone: string;
  email?: string;
  address?: string;
  departmentId?: string;
  positionId?: string;
  employmentType?: string;
  employmentStatus?: string;
  hireDate?: Date;
  bankName?: string;
  accountNumber?: string;
  taxIdNumber?: string;
  pensionPin?: string;
  pensionPfaName?: string;
  userId?: string;
  performedById?: string;
}) {
  let empNum = data.employeeNumber?.trim().toUpperCase();
  if (!empNum) {
    empNum = await generateNextEmployeeNumber(data.schoolId);
  }

  const existing = await db
    .select()
    .from(hrEmployees)
    .where(and(eq(hrEmployees.schoolId, data.schoolId), eq(hrEmployees.employeeNumber, empNum)));

  if (existing.length > 0) {
    throw new Error(`Employee number "${empNum}" already exists.`);
  }

  const normalizedStatus = data.employmentStatus
    ? data.employmentStatus.charAt(0).toUpperCase() + data.employmentStatus.slice(1).toLowerCase()
    : "Active";

  const [employee] = await db
    .insert(hrEmployees)
    .values({
      schoolId: data.schoolId,
      employeeNumber: empNum,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      middleName: data.middleName?.trim(),
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      phone: data.phone.trim(),
      email: data.email?.trim().toLowerCase(),
      address: data.address?.trim(),
      departmentId: data.departmentId,
      positionId: data.positionId,
      employmentType: data.employmentType || "Full-time",
      employmentStatus: normalizedStatus,
      hireDate: data.hireDate || new Date(),
      bankName: data.bankName?.trim(),
      accountNumber: data.accountNumber?.trim(),
      taxIdNumber: data.taxIdNumber?.trim(),
      pensionPin: data.pensionPin?.trim(),
      pensionPfaName: data.pensionPfaName?.trim(),
      userId: data.userId,
    })
    .returning();

  // Initialize Leave Balances (30 Days Annual, 10 Days Sick, 5 Days Casual)
  const currentYear = new Date().getFullYear();
  await db
    .insert(hrLeaveBalances)
    .values([
      { schoolId: data.schoolId, employeeId: employee.id, leaveType: "Annual", year: currentYear, entitledDays: 30, remainingDays: 30 },
      { schoolId: data.schoolId, employeeId: employee.id, leaveType: "Sick", year: currentYear, entitledDays: 10, remainingDays: 10 },
      { schoolId: data.schoolId, employeeId: employee.id, leaveType: "Casual", year: currentYear, entitledDays: 5, remainingDays: 5 },
    ])
    .onConflictDoNothing();

  await logHRAuditEvent({
    schoolId: data.schoolId,
    performedById: data.performedById,
    action: "employee_created",
    employeeId: employee.id,
    details: `Created employee profile for ${employee.firstName} ${employee.lastName} (${employee.employeeNumber}).`,
  });

  return employee;
}

// ── 4. Unified Staff Member Registration (Teachers & HR) ─────
export async function registerStaffMember(data: {
  schoolId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender?: string;
  dateOfBirth?: Date;
  phone: string;
  email: string;
  address?: string;
  departmentId?: string;
  positionId?: string;
  employmentType?: string;
  hireDate?: Date;
  bankName?: string;
  accountNumber?: string;
  taxIdNumber?: string;
  pensionPin?: string;
  pensionPfaName?: string;
  isTeachingStaff?: boolean;
  formClassId?: string;
  performedById?: string;
  employeeNumber?: string;
}) {
  const normalizedEmail = data.email.trim().toLowerCase();
  const normalizedPhone = data.phone.trim();
  const normalizedFirstName = data.firstName.trim();
  const normalizedLastName = data.lastName.trim();

  // 1. If teaching staff, provision / link user account
  let userId: string | undefined = undefined;
  if (data.isTeachingStaff) {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.schoolId, data.schoolId), eq(users.email, normalizedEmail)));

    if (existingUser) {
      userId = existingUser.id;
      await db
        .update(users)
        .set({ role: "teacher", isActive: true, updatedAt: new Date() })
        .where(eq(users.id, existingUser.id));
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          schoolId: data.schoolId,
          email: normalizedEmail,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          role: "teacher",
          isActive: true,
        })
        .returning();
      userId = newUser.id;
    }

    // 2. Assign as form teacher if formClassId specified
    if (data.formClassId && userId) {
      await db
        .update(classes)
        .set({ classTeacherId: userId, updatedAt: new Date() })
        .where(and(eq(classes.id, data.formClassId), eq(classes.schoolId, data.schoolId)));
    }
  }

  // 3. Create HR Employee record using standard format and Title Case "Active" status
  const employee = await createEmployee({
    schoolId: data.schoolId,
    employeeNumber: data.employeeNumber,
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    middleName: data.middleName?.trim(),
    gender: data.gender,
    dateOfBirth: data.dateOfBirth,
    phone: normalizedPhone,
    email: normalizedEmail,
    address: data.address?.trim(),
    departmentId: data.departmentId,
    positionId: data.positionId,
    employmentType: data.employmentType || "Full-time",
    employmentStatus: "Active",
    hireDate: data.hireDate || new Date(),
    bankName: data.bankName?.trim(),
    accountNumber: data.accountNumber?.trim(),
    taxIdNumber: data.taxIdNumber?.trim(),
    pensionPin: data.pensionPin?.trim(),
    pensionPfaName: data.pensionPfaName?.trim(),
    userId,
    performedById: data.performedById,
  });

  return { employee, userId };
}

export async function recordSalaryChange(data: {
  schoolId: string;
  employeeId: string;
  oldBasicSalary: number;
  newBasicSalary: number;
  reason: string;
  effectiveDate?: Date;
  changedById?: string;
}) {
  const [history] = await db
    .insert(hrSalaryHistory)
    .values({
      schoolId: data.schoolId,
      employeeId: data.employeeId,
      oldBasicSalary: data.oldBasicSalary,
      newBasicSalary: data.newBasicSalary,
      effectiveDate: data.effectiveDate || new Date(),
      changedById: data.changedById,
      reason: data.reason.trim(),
    })
    .returning();

  await logHRAuditEvent({
    schoolId: data.schoolId,
    performedById: data.changedById,
    action: "salary_updated",
    employeeId: data.employeeId,
    details: `Updated basic salary from ₦${data.oldBasicSalary.toLocaleString()} to ₦${data.newBasicSalary.toLocaleString()}. Reason: ${data.reason.trim()}`,
  });

  return history;
}

export async function getEmployeeSalaryHistory(schoolId: string, employeeId: string) {
  return await db
    .select()
    .from(hrSalaryHistory)
    .where(and(eq(hrSalaryHistory.schoolId, schoolId), eq(hrSalaryHistory.employeeId, employeeId)))
    .orderBy(desc(hrSalaryHistory.createdAt));
}

// ── 3. Employee Document Management ─────────────────────────
export async function uploadEmployeeDocument(data: {
  schoolId: string;
  employeeId: string;
  documentType: string;
  title: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  uploadedById?: string;
}) {
  const [doc] = await db
    .insert(hrEmployeeDocuments)
    .values({
      schoolId: data.schoolId,
      employeeId: data.employeeId,
      documentType: data.documentType,
      title: data.title.trim(),
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      uploadedById: data.uploadedById,
    })
    .returning();

  await logHRAuditEvent({
    schoolId: data.schoolId,
    performedById: data.uploadedById,
    action: "document_uploaded",
    employeeId: data.employeeId,
    details: `Uploaded HR document "${data.title}" (${data.documentType}).`,
  });

  return doc;
}

export async function getEmployeeDocuments(schoolId: string, employeeId: string) {
  return await db
    .select()
    .from(hrEmployeeDocuments)
    .where(and(eq(hrEmployeeDocuments.schoolId, schoolId), eq(hrEmployeeDocuments.employeeId, employeeId)))
    .orderBy(desc(hrEmployeeDocuments.createdAt));
}

// ── 4. Salary Structure & Allowances Config ──────────────────
export async function createSalaryStructure(data: {
  schoolId: string;
  name: string;
  gradeLevel?: string;
  basicSalary: number;
  taxDeductionRate?: number;
  pensionDeductionRate?: number;
  allowances?: Array<{ allowanceType: string; amount: number; isTaxable?: boolean }>;
}) {
  const [structure] = await db
    .insert(hrSalaryStructures)
    .values({
      schoolId: data.schoolId,
      name: data.name.trim(),
      gradeLevel: data.gradeLevel?.trim(),
      basicSalary: data.basicSalary,
      taxDeductionRate: data.taxDeductionRate ?? 7.5,
      pensionDeductionRate: data.pensionDeductionRate ?? 8.0,
      status: "active",
    })
    .returning();

  if (data.allowances && data.allowances.length > 0) {
    for (const a of data.allowances) {
      await db.insert(hrAllowances).values({
        schoolId: data.schoolId,
        salaryStructureId: structure.id,
        allowanceType: a.allowanceType.trim(),
        amount: a.amount,
        isTaxable: a.isTaxable !== false,
      });
    }
  }

  return structure;
}

// ── 5. Leave Request & Balance Workflow ──────────────────────
export async function getEmployeeLeaveBalances(schoolId: string, employeeId: string, year = new Date().getFullYear()) {
  const balances = await db
    .select()
    .from(hrLeaveBalances)
    .where(
      and(
        eq(hrLeaveBalances.schoolId, schoolId),
        eq(hrLeaveBalances.employeeId, employeeId),
        eq(hrLeaveBalances.year, year)
      )
    );

  if (balances.length === 0) {
    // Lazy initialize default balances
    const created = await db
      .insert(hrLeaveBalances)
      .values([
        { schoolId, employeeId, leaveType: "Annual", year, entitledDays: 30, remainingDays: 30 },
        { schoolId, employeeId, leaveType: "Sick", year, entitledDays: 10, remainingDays: 10 },
        { schoolId, employeeId, leaveType: "Casual", year, entitledDays: 5, remainingDays: 5 },
      ])
      .returning();
    return created;
  }

  return balances;
}

export async function submitLeaveRequest(data: {
  schoolId: string;
  employeeId: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
}) {
  // Check leave balance
  const year = data.startDate.getFullYear();
  const balances = await getEmployeeLeaveBalances(data.schoolId, data.employeeId, year);
  const bal = balances.find((b) => b.leaveType.toLowerCase() === data.leaveType.toLowerCase());

  if (bal && bal.remainingDays < data.totalDays) {
    throw new Error(`Insufficient ${data.leaveType} leave balance. Remaining: ${bal.remainingDays} days, Requested: ${data.totalDays} days.`);
  }

  const [req] = await db
    .insert(hrLeaveRequests)
    .values({
      schoolId: data.schoolId,
      employeeId: data.employeeId,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays: data.totalDays,
      reason: data.reason.trim(),
      status: "Pending",
    })
    .returning();

  return req;
}

export async function reviewLeaveRequest(schoolId: string, leaveRequestId: string, reviewedById: string, remarks?: string) {
  const [req] = await db
    .update(hrLeaveRequests)
    .set({
      status: "Reviewed",
      reviewedById,
      reviewedAt: new Date(),
      remarks,
      updatedAt: new Date(),
    })
    .where(and(eq(hrLeaveRequests.id, leaveRequestId), eq(hrLeaveRequests.schoolId, schoolId)))
    .returning();

  return req;
}

export async function approveLeaveRequest(schoolId: string, leaveRequestId: string, approvedById: string, remarks?: string) {
  const [req] = await db
    .select()
    .from(hrLeaveRequests)
    .where(and(eq(hrLeaveRequests.id, leaveRequestId), eq(hrLeaveRequests.schoolId, schoolId)));

  if (!req) throw new Error("Leave request not found.");
  if (req.status === "Approved") throw new Error("Leave request is already approved.");

  // Update Leave Balance
  const year = req.startDate.getFullYear();
  const balances = await getEmployeeLeaveBalances(schoolId, req.employeeId, year);
  const bal = balances.find((b) => b.leaveType.toLowerCase() === req.leaveType.toLowerCase());

  if (bal) {
    const newTaken = bal.takenDays + req.totalDays;
    const newRemaining = Math.max(0, bal.entitledDays - newTaken);
    await db
      .update(hrLeaveBalances)
      .set({
        takenDays: newTaken,
        remainingDays: newRemaining,
        updatedAt: new Date(),
      })
      .where(eq(hrLeaveBalances.id, bal.id));
  }

  // Update request status
  const [approvedReq] = await db
    .update(hrLeaveRequests)
    .set({
      status: "Approved",
      approvedById,
      approvedAt: new Date(),
      remarks,
      updatedAt: new Date(),
    })
    .where(and(eq(hrLeaveRequests.id, leaveRequestId), eq(hrLeaveRequests.schoolId, schoolId)))
    .returning();

  await logHRAuditEvent({
    schoolId,
    performedById: approvedById,
    action: "leave_approved",
    employeeId: req.employeeId,
    details: `Approved ${req.totalDays}-day ${req.leaveType} leave request.`,
  });

  return approvedReq;
}

// ── 6. Automated Monthly Payroll Run Engine (with Attendance) ─
export async function calculateMonthlyPayrollRun(data: {
  schoolId: string;
  payPeriodMonth: number; // 1..12
  payPeriodYear: number; // e.g. 2026
  runTitle: string;
  processedById?: string;
}) {
  const { schoolId, payPeriodMonth, payPeriodYear, runTitle, processedById } = data;

  // Check if run already exists and is locked
  const existingRun = await db
    .select()
    .from(hrPayrollRuns)
    .where(
      and(
        eq(hrPayrollRuns.schoolId, schoolId),
        eq(hrPayrollRuns.payPeriodMonth, payPeriodMonth),
        eq(hrPayrollRuns.payPeriodYear, payPeriodYear)
      )
    );

  if (existingRun.length > 0 && (existingRun[0].status === "Locked" || existingRun[0].status === "Paid")) {
    throw new Error(`Payroll for ${payPeriodMonth}/${payPeriodYear} is ${existingRun[0].status} and cannot be recalculated.`);
  }

  // Create or reset Draft Payroll Run
  let runId = existingRun[0]?.id;
  if (!runId) {
    const [newRun] = await db
      .insert(hrPayrollRuns)
      .values({
        schoolId,
        payPeriodMonth,
        payPeriodYear,
        runTitle: runTitle.trim(),
        status: "Calculated",
        processedById,
      })
      .returning();
    runId = newRun.id;
  } else {
    // Clear old draft payslips
    const oldPayslips = await db
      .select({ id: hrPayslips.id })
      .from(hrPayslips)
      .where(eq(hrPayslips.payrollRunId, runId));

    if (oldPayslips.length > 0) {
      const pIds = oldPayslips.map((p) => p.id);
      await db.delete(hrPayrollItems).where(inArray(hrPayrollItems.payslipId, pIds));
      await db.delete(hrPayslips).where(eq(hrPayslips.payrollRunId, runId));
    }
  }

  // Fetch active employees under school (case-insensitive)
  const activeEmployees = await db
    .select()
    .from(hrEmployees)
    .where(and(eq(hrEmployees.schoolId, schoolId), sql`LOWER(${hrEmployees.employmentStatus}) = 'active'`));

  let runTotalGross = 0;
  let runTotalDeductions = 0;
  let runTotalNet = 0;

  for (const emp of activeEmployees) {
    // 1. Fetch Salary Structure & Allowances
    let basicSalary = 100000; // Base default if no structure linked
    let taxRate = 7.5;
    let pensionRate = 8.0;
    let allowanceItems: Array<{ type: string; amount: number; isTaxable: boolean }> = [];

    if (emp.positionId) {
      const [pos] = await db.select().from(hrPositions).where(eq(hrPositions.id, emp.positionId));
      if (pos && pos.minSalary) basicSalary = pos.minSalary;
    }

    const structures = await db
      .select()
      .from(hrSalaryStructures)
      .where(and(eq(hrSalaryStructures.schoolId, schoolId), eq(hrSalaryStructures.status, "active")))
      .limit(1);

    if (structures.length > 0) {
      const struct = structures[0];
      basicSalary = struct.basicSalary || basicSalary;
      taxRate = struct.taxDeductionRate;
      pensionRate = struct.pensionDeductionRate;

      const allowances = await db
        .select()
        .from(hrAllowances)
        .where(eq(hrAllowances.salaryStructureId, struct.id));

      allowanceItems = allowances.map((a) => ({
        type: a.allowanceType,
        amount: a.amount,
        isTaxable: a.isTaxable,
      }));
    }

    // Default Allowances if none configured (Housing & Transport)
    if (allowanceItems.length === 0) {
      allowanceItems = [
        { type: "Housing Allowance", amount: basicSalary * 0.2, isTaxable: true },
        { type: "Transport Allowance", amount: basicSalary * 0.1, isTaxable: true },
      ];
    }

    const totalAllowances = allowanceItems.reduce((acc, curr) => acc + curr.amount, 0);
    const grossSalary = basicSalary + totalAllowances;

    // 2. Attendance Deduction Integration
    // Explicitly read staff attendance (absences & unexcused lateness)
    let attendanceDeductions = 0;
    if (emp.userId) {
      const startOfMonth = new Date(payPeriodYear, payPeriodMonth - 1, 1);
      const endOfMonth = new Date(payPeriodYear, payPeriodMonth, 0);

      const attendanceRecords = await db
        .select()
        .from(staffAttendance)
        .where(
          and(
            eq(staffAttendance.schoolId, schoolId),
            eq(staffAttendance.userId, emp.userId),
            gte(staffAttendance.date, startOfMonth.toISOString().slice(0, 10)),
            lte(staffAttendance.date, endOfMonth.toISOString().slice(0, 10))
          )
        );

      const unexcusedAbsences = attendanceRecords.filter((a) => a.status === "absent").length;
      if (unexcusedAbsences > 0) {
        // Daily rate penalty = (basicSalary / 22 working days) * unexcusedAbsences
        const dailyRate = basicSalary / 22;
        attendanceDeductions = Math.round(dailyRate * unexcusedAbsences);
      }
    }

    // 3. Tax & Pension Deductions
    const taxDeduction = (grossSalary * taxRate) / 100;
    const pensionDeduction = (basicSalary * pensionRate) / 100;

    const totalDeductions = taxDeduction + pensionDeduction + attendanceDeductions;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    // 4. Create Immutable Payslip Snapshot
    const [payslip] = await db
      .insert(hrPayslips)
      .values({
        schoolId,
        payrollRunId: runId,
        employeeId: emp.id,
        basicSalary,
        totalAllowances,
        grossSalary,
        taxDeduction,
        pensionDeduction,
        attendanceDeductions,
        totalDeductions,
        netSalary,
        paymentStatus: "Unpaid",
      })
      .returning();

    // 5. Create Immutable Payroll Items Snapshot
    // Basic
    await db.insert(hrPayrollItems).values({ schoolId, payslipId: payslip.id, itemType: "basic", itemLabel: "Basic Salary", amount: basicSalary, isTaxable: true });

    // Allowances
    for (const a of allowanceItems) {
      await db.insert(hrPayrollItems).values({ schoolId, payslipId: payslip.id, itemType: "allowance", itemLabel: a.type, amount: a.amount, isTaxable: a.isTaxable });
    }

    // Tax & Pension
    await db.insert(hrPayrollItems).values({ schoolId, payslipId: payslip.id, itemType: "tax", itemLabel: `PAYE Tax (${taxRate}%)`, amount: taxDeduction, isTaxable: false });
    await db.insert(hrPayrollItems).values({ schoolId, payslipId: payslip.id, itemType: "pension", itemLabel: `Pension Deduction (${pensionRate}%)`, amount: pensionDeduction, isTaxable: false });

    // Attendance penalty if any
    if (attendanceDeductions > 0) {
      await db.insert(hrPayrollItems).values({ schoolId, payslipId: payslip.id, itemType: "attendance_penalty", itemLabel: "Unexcused Absence Penalty", amount: attendanceDeductions, isTaxable: false });
    }

    runTotalGross += grossSalary;
    runTotalDeductions += totalDeductions;
    runTotalNet += netSalary;
  }

  // Update Run Totals
  const [updatedRun] = await db
    .update(hrPayrollRuns)
    .set({
      totalGrossSalary: runTotalGross,
      totalDeductions: runTotalDeductions,
      totalNetSalary: runTotalNet,
      status: "Calculated",
      updatedAt: new Date(),
    })
    .where(eq(hrPayrollRuns.id, runId))
    .returning();

  await logHRAuditEvent({
    schoolId,
    performedById: processedById,
    action: "payroll_calculated",
    details: `Calculated monthly payroll for ${payPeriodMonth}/${payPeriodYear}. Total Net: ₦${runTotalNet.toLocaleString()}.`,
  });

  return updatedRun;
}

// ── 7. Payroll Approval, Payment & Locking Workflow ─────────
export async function approvePayrollRun(schoolId: string, payrollRunId: string, approvedById: string) {
  const [run] = await db
    .update(hrPayrollRuns)
    .set({
      status: "Approved",
      approvedById,
      updatedAt: new Date(),
    })
    .where(and(eq(hrPayrollRuns.id, payrollRunId), eq(hrPayrollRuns.schoolId, schoolId)))
    .returning();

  await logHRAuditEvent({
    schoolId,
    performedById: approvedById,
    action: "payroll_approved",
    details: `Approved payroll run "${run.runTitle}".`,
  });

  return run;
}

export async function markPayrollAsPaid(schoolId: string, payrollRunId: string, paidById: string) {
  const [run] = await db
    .update(hrPayrollRuns)
    .set({
      status: "Paid",
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(hrPayrollRuns.id, payrollRunId), eq(hrPayrollRuns.schoolId, schoolId)))
    .returning();

  // Mark all payslips as Paid
  await db
    .update(hrPayslips)
    .set({ paymentStatus: "Paid", paymentDate: new Date() })
    .where(eq(hrPayslips.payrollRunId, payrollRunId));

  // Lock payroll immediately after payment
  const lockedRun = await lockPayrollRun(schoolId, payrollRunId);

  await logHRAuditEvent({
    schoolId,
    performedById: paidById,
    action: "payroll_paid",
    details: `Disbursed salaries for payroll run "${run.runTitle}".`,
  });

  return lockedRun;
}

export async function lockPayrollRun(schoolId: string, payrollRunId: string) {
  const [run] = await db
    .update(hrPayrollRuns)
    .set({
      status: "Locked",
      lockedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(hrPayrollRuns.id, payrollRunId), eq(hrPayrollRuns.schoolId, schoolId)))
    .returning();

  return run;
}

// ── 8. Bank Payment Export ──────────────────────────────────
export async function generateBankPaymentExport(schoolId: string, payrollRunId: string) {
  const payslips = await db
    .select({
      employeeNumber: hrEmployees.employeeNumber,
      fullName: sql<string>`${hrEmployees.lastName} || ', ' || ${hrEmployees.firstName}`,
      bankName: hrEmployees.bankName,
      accountNumber: hrEmployees.accountNumber,
      netSalary: hrPayslips.netSalary,
    })
    .from(hrPayslips)
    .leftJoin(hrEmployees, eq(hrPayslips.employeeId, hrEmployees.id))
    .where(and(eq(hrPayslips.schoolId, schoolId), eq(hrPayslips.payrollRunId, payrollRunId)));

  return payslips.map((p) => ({
    EmployeeNo: p.employeeNumber,
    FullName: p.fullName,
    BankName: p.bankName || "GTBank",
    AccountNumber: p.accountNumber || "0000000000",
    NetSalary: p.netSalary,
  }));
}

// ── 9. Employee Self-Service Helper ─────────────────────────
export async function getEmployeeSelfServiceProfile(schoolId: string, userId: string) {
  const [employee] = await db
    .select()
    .from(hrEmployees)
    .where(and(eq(hrEmployees.schoolId, schoolId), eq(hrEmployees.userId, userId)));

  if (!employee) return null;

  const [payslips, leaveBalances, leaveRequests] = await Promise.all([
    db.select().from(hrPayslips).where(eq(hrPayslips.employeeId, employee.id)).orderBy(desc(hrPayslips.createdAt)),
    getEmployeeLeaveBalances(schoolId, employee.id),
    db.select().from(hrLeaveRequests).where(eq(hrLeaveRequests.employeeId, employee.id)).orderBy(desc(hrLeaveRequests.createdAt)),
  ]);

  return {
    employee,
    payslips,
    leaveBalances,
    leaveRequests,
  };
}

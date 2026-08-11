import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  db,
  hrEmployees,
  hrDepartments,
  hrPositions,
  hrLeaveRequests,
  hrPayrollRuns,
  hrSalaryStructures,
  hrAllowances,
  hrAuditLogs,
} from "@apexium/db";
import { eq, desc } from "drizzle-orm";
import type { Metadata } from "next";
import { HRClient } from "./HRClient";

export const metadata: Metadata = {
  title: "Human Resources & Payroll — ERP",
};

export default async function HRDashboardPage() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    redirect("/auth/login");
  }

  let employees: any[] = [];
  let departments: any[] = [];
  let positions: any[] = [];
  let leaveRequests: any[] = [];
  let payrollRuns: any[] = [];
  let salaryStructures: any[] = [];
  let auditLogs: any[] = [];

  try {
    const [
      eList,
      dList,
      pList,
      lList,
      rList,
      sList,
      aList,
    ] = await Promise.all([
      db
        .select({
          id: hrEmployees.id,
          employeeNumber: hrEmployees.employeeNumber,
          firstName: hrEmployees.firstName,
          lastName: hrEmployees.lastName,
          phone: hrEmployees.phone,
          email: hrEmployees.email,
          employmentType: hrEmployees.employmentType,
          employmentStatus: hrEmployees.employmentStatus,
          hireDate: hrEmployees.hireDate,
          bankName: hrEmployees.bankName,
          accountNumber: hrEmployees.accountNumber,
          departmentName: hrDepartments.departmentName,
          positionTitle: hrPositions.title,
        })
        .from(hrEmployees)
        .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
        .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
        .where(eq(hrEmployees.schoolId, user.schoolId))
        .orderBy(desc(hrEmployees.createdAt)),
      db.select().from(hrDepartments).where(eq(hrDepartments.schoolId, user.schoolId)).orderBy(desc(hrDepartments.createdAt)),
      db
        .select({
          id: hrPositions.id,
          title: hrPositions.title,
          gradeLevel: hrPositions.gradeLevel,
          minSalary: hrPositions.minSalary,
          maxSalary: hrPositions.maxSalary,
          departmentName: hrDepartments.departmentName,
        })
        .from(hrPositions)
        .leftJoin(hrDepartments, eq(hrPositions.departmentId, hrDepartments.id))
        .where(eq(hrPositions.schoolId, user.schoolId))
        .orderBy(desc(hrPositions.createdAt)),
      db
        .select({
          id: hrLeaveRequests.id,
          leaveType: hrLeaveRequests.leaveType,
          startDate: hrLeaveRequests.startDate,
          endDate: hrLeaveRequests.endDate,
          totalDays: hrLeaveRequests.totalDays,
          reason: hrLeaveRequests.reason,
          status: hrLeaveRequests.status,
          remarks: hrLeaveRequests.remarks,
          employeeName: hrEmployees.firstName,
          employeeLastName: hrEmployees.lastName,
          employeeNumber: hrEmployees.employeeNumber,
        })
        .from(hrLeaveRequests)
        .leftJoin(hrEmployees, eq(hrLeaveRequests.employeeId, hrEmployees.id))
        .where(eq(hrLeaveRequests.schoolId, user.schoolId))
        .orderBy(desc(hrLeaveRequests.createdAt)),
      db.select().from(hrPayrollRuns).where(eq(hrPayrollRuns.schoolId, user.schoolId)).orderBy(desc(hrPayrollRuns.createdAt)),
      db.select().from(hrSalaryStructures).where(eq(hrSalaryStructures.schoolId, user.schoolId)).orderBy(desc(hrSalaryStructures.createdAt)),
      db.select().from(hrAuditLogs).where(eq(hrAuditLogs.schoolId, user.schoolId)).orderBy(desc(hrAuditLogs.createdAt)).limit(50),
    ]);

    employees = eList.map((e) => ({
      ...e,
      hireDate: e.hireDate ? e.hireDate.toISOString() : undefined,
    }));
    departments = dList;
    positions = pList;
    leaveRequests = lList.map((l) => ({
      ...l,
      startDate: l.startDate ? l.startDate.toISOString() : "",
      endDate: l.endDate ? l.endDate.toISOString() : "",
    }));
    payrollRuns = rList.map((r) => ({
      ...r,
      createdAt: r.createdAt ? r.createdAt.toISOString() : "",
    }));

    salaryStructures = await Promise.all(
      sList.map(async (s) => {
        const allowances = await db
          .select()
          .from(hrAllowances)
          .where(eq(hrAllowances.salaryStructureId, s.id));
        return { ...s, allowances };
      })
    );

    auditLogs = aList.map((a) => ({
      ...a,
      createdAt: a.createdAt ? a.createdAt.toISOString() : "",
    }));
  } catch (error) {
    console.error("Failed loading HR dashboard data:", error);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Human Resources & Payroll System
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage teaching and non-teaching staff, departments, leave approvals, attendance-integrated payroll, and bank transfer exports.
          </p>
        </div>
      </div>

      <HRClient
        initialEmployees={employees}
        initialDepartments={departments}
        initialPositions={positions}
        initialLeaveRequests={leaveRequests}
        initialPayrollRuns={payrollRuns}
        initialSalaryStructures={salaryStructures}
        initialAuditLogs={auditLogs}
        userRole={user.role}
      />
    </div>
  );
}

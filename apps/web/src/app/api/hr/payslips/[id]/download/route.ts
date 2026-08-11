import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, hrPayslips, hrPayrollItems, hrEmployees, hrDepartments } from "@apexium/db";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [payslip] = await db
      .select({
        id: hrPayslips.id,
        basicSalary: hrPayslips.basicSalary,
        totalAllowances: hrPayslips.totalAllowances,
        grossSalary: hrPayslips.grossSalary,
        taxDeduction: hrPayslips.taxDeduction,
        pensionDeduction: hrPayslips.pensionDeduction,
        attendanceDeductions: hrPayslips.attendanceDeductions,
        otherDeductions: hrPayslips.otherDeductions,
        totalDeductions: hrPayslips.totalDeductions,
        netSalary: hrPayslips.netSalary,
        paymentStatus: hrPayslips.paymentStatus,
        paymentDate: hrPayslips.paymentDate,
        createdAt: hrPayslips.createdAt,
        employeeNumber: hrEmployees.employeeNumber,
        firstName: hrEmployees.firstName,
        lastName: hrEmployees.lastName,
        bankName: hrEmployees.bankName,
        accountNumber: hrEmployees.accountNumber,
        taxIdNumber: hrEmployees.taxIdNumber,
        departmentName: hrDepartments.departmentName,
      })
      .from(hrPayslips)
      .leftJoin(hrEmployees, eq(hrPayslips.employeeId, hrEmployees.id))
      .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
      .where(and(eq(hrPayslips.id, params.id), eq(hrPayslips.schoolId, user.schoolId)));

    if (!payslip) {
      return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(hrPayrollItems)
      .where(eq(hrPayrollItems.payslipId, payslip.id));

    return NextResponse.json({
      success: true,
      data: {
        payslip,
        items,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

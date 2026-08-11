import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createEmployee, db, hrEmployees, hrDepartments, hrPositions } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db
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
      .orderBy(desc(hrEmployees.createdAt));

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin" || !user.schoolId) {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const emp = await createEmployee({
      schoolId: user.schoolId,
      employeeNumber: body.employeeNumber,
      firstName: body.firstName,
      lastName: body.lastName,
      middleName: body.middleName,
      gender: body.gender,
      phone: body.phone,
      email: body.email,
      departmentId: body.departmentId,
      positionId: body.positionId,
      employmentType: body.employmentType,
      bankName: body.bankName,
      accountNumber: body.accountNumber,
      taxIdNumber: body.taxIdNumber,
      pensionPin: body.pensionPin,
      performedById: user.id,
    });

    return NextResponse.json({ success: true, data: emp });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

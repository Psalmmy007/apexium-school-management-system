import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createSalaryStructure, db, hrSalaryStructures, hrAllowances } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db
      .select()
      .from(hrSalaryStructures)
      .where(eq(hrSalaryStructures.schoolId, user.schoolId))
      .orderBy(desc(hrSalaryStructures.createdAt));

    const withAllowances = await Promise.all(
      list.map(async (s) => {
        const allowances = await db
          .select()
          .from(hrAllowances)
          .where(eq(hrAllowances.salaryStructureId, s.id));
        return { ...s, allowances };
      })
    );

    return NextResponse.json({ success: true, data: withAllowances });
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
    const struct = await createSalaryStructure({
      schoolId: user.schoolId,
      name: body.name,
      gradeLevel: body.gradeLevel,
      basicSalary: parseFloat(body.basicSalary),
      taxDeductionRate: body.taxDeductionRate ? parseFloat(body.taxDeductionRate) : undefined,
      pensionDeductionRate: body.pensionDeductionRate ? parseFloat(body.pensionDeductionRate) : undefined,
      allowances: body.allowances,
    });

    return NextResponse.json({ success: true, data: struct });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

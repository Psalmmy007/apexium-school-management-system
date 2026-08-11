import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { calculateMonthlyPayrollRun, db, hrPayrollRuns, hrPayslips } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const runs = await db
      .select()
      .from(hrPayrollRuns)
      .where(eq(hrPayrollRuns.schoolId, user.schoolId))
      .orderBy(desc(hrPayrollRuns.createdAt));

    return NextResponse.json({ success: true, data: runs });
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
    const run = await calculateMonthlyPayrollRun({
      schoolId: user.schoolId,
      payPeriodMonth: parseInt(body.payPeriodMonth, 10),
      payPeriodYear: parseInt(body.payPeriodYear, 10),
      runTitle: body.runTitle || `Monthly Payroll — ${body.payPeriodMonth}/${body.payPeriodYear}`,
      processedById: user.id,
    });

    return NextResponse.json({ success: true, data: run });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { approvePayrollRun } from "@apexium/db";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin" || !user.schoolId) {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const run = await approvePayrollRun(user.schoolId, body.payrollRunId, user.id);
    return NextResponse.json({ success: true, data: run });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

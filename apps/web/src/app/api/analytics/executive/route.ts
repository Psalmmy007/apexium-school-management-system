import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { generateExecutiveKpiSummary } from "@apexium/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await generateExecutiveKpiSummary(user.schoolId);
    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

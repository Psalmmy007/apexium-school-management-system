import { NextRequest, NextResponse } from "next/server";
import { getLibraryAuditingSummary, getLibraryReports } from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") || "default-school-id";

    const audit = await getLibraryAuditingSummary(schoolId);
    const reports = await getLibraryReports(schoolId);

    return NextResponse.json({ success: true, data: { audit, reports } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { reportHostelMaintenance } from "@apexium/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId = "default-school-id", hostelId, roomId, issueDescription, bedId } = body;

    if (!hostelId || !issueDescription) {
      return NextResponse.json({ success: false, error: "Hostel ID and Issue Description are required" }, { status: 400 });
    }

    const maint = await reportHostelMaintenance(schoolId, hostelId, roomId, issueDescription, bedId);
    return NextResponse.json({ success: true, data: maint });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

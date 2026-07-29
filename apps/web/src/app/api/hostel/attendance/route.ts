import { NextRequest, NextResponse } from "next/server";
import { recordHostelAttendance } from "@apexium/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId = "default-school-id", hostelId, date, records, markedById } = body;

    if (!hostelId || !date || !records) {
      return NextResponse.json({ success: false, error: "Hostel ID, Date, and Records array are required" }, { status: 400 });
    }

    const inserted = await recordHostelAttendance(schoolId, hostelId, date, records, markedById);
    return NextResponse.json({ success: true, data: inserted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { listHostels, createHostel } from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") || "default-school-id";

    const items = await listHostels(schoolId);
    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId = "default-school-id", ...hostelInput } = body;

    if (!hostelInput.name) {
      return NextResponse.json({ success: false, error: "Hostel name is required" }, { status: 400 });
    }

    const created = await createHostel(schoolId, hostelInput);
    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

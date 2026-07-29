import { NextRequest, NextResponse } from "next/server";
import { allocateStudentToBed } from "@apexium/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId = "default-school-id", studentId, hostelId, roomId, bedId } = body;

    if (!studentId || !hostelId || !roomId || !bedId) {
      return NextResponse.json({ success: false, error: "Student ID, Hostel ID, Room ID, and Bed ID are required" }, { status: 400 });
    }

    const allocation = await allocateStudentToBed(schoolId, studentId, hostelId, roomId, bedId);
    return NextResponse.json({ success: true, data: allocation });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

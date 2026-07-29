import { NextRequest, NextResponse } from "next/server";
import { transferStudentHostelRoom } from "@apexium/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId = "default-school-id", studentId, targetRoomId, targetBedId, reason } = body;

    if (!studentId || !targetRoomId || !targetBedId) {
      return NextResponse.json({ success: false, error: "Student ID, Target Room ID, and Target Bed ID are required" }, { status: 400 });
    }

    const transfer = await transferStudentHostelRoom(schoolId, studentId, targetRoomId, targetBedId, reason);
    return NextResponse.json({ success: true, data: transfer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

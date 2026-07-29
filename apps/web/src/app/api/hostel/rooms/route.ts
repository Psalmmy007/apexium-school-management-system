import { NextRequest, NextResponse } from "next/server";
import { createHostelRoom, getRoomWithBeds } from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") || "default-school-id";
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json({ success: false, error: "Room ID is required" }, { status: 400 });
    }

    const data = await getRoomWithBeds(schoolId, roomId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId = "default-school-id", ...roomInput } = body;

    if (!roomInput.hostelId || !roomInput.roomNumber) {
      return NextResponse.json({ success: false, error: "Hostel ID and Room Number are required" }, { status: 400 });
    }

    const created = await createHostelRoom(schoolId, roomInput);
    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

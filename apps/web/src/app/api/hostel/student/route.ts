import { NextRequest, NextResponse } from "next/server";
import { getStudentHostelProfile } from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") || "default-school-id";
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ success: false, error: "Student ID is required" }, { status: 400 });
    }

    const profile = await getStudentHostelProfile(schoolId, studentId);
    return NextResponse.json({ success: true, data: profile });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

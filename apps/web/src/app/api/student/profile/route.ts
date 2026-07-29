import { NextResponse, type NextRequest } from "next/server";
import { getStudentSessionUser } from "@/lib/auth/session";
import { getStudentProfileByUserId, updateStudentProfile } from "@apexium/db";

export async function GET(request: NextRequest) {
  const user = await getStudentSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const student = await getStudentProfileByUserId(user.schoolId, user.id);
    return NextResponse.json({ success: true, data: student });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch student profile";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getStudentSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const student = await getStudentProfileByUserId(user.schoolId, user.id);
    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    const body = await request.json();
    const updated = await updateStudentProfile(user.schoolId, student.id, body);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update profile";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

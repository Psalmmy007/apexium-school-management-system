import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getStudentProfileByUserId, updateStudentProfile } from "@apexium/db";

// GET /api/student/profile — fetch student profile
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const student = await getStudentProfileByUserId(user.schoolId, user.id);
    if (!student) {
      return NextResponse.json({ success: false, error: "Student profile not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: student });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch student profile";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PATCH /api/student/profile — update profile photo, address, notification preferences
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const student = await getStudentProfileByUserId(user.schoolId, user.id);
    if (!student) {
      return NextResponse.json({ success: false, error: "Student profile not found" }, { status: 404 });
    }

    const updated = await updateStudentProfile(user.schoolId, student.id, {
      photoUrl: body.photoUrl,
      address: body.address,
      notificationPreferences: body.notificationPreferences,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update profile";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

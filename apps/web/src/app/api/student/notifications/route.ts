import { NextResponse, type NextRequest } from "next/server";
import { getStudentSessionUser } from "@/lib/auth/session";
import {
  getStudentProfileByUserId,
  getStudentNotifications,
  markNotificationAsRead,
} from "@apexium/db";

export async function GET(request: NextRequest) {
  const user = await getStudentSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const student = await getStudentProfileByUserId(user.schoolId, user.id);
    if (!student) return NextResponse.json({ success: true, data: [] });

    const notifications = await getStudentNotifications(user.schoolId, student.id);
    return NextResponse.json({ success: true, data: notifications });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch student notifications";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getStudentSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const student = await getStudentProfileByUserId(user.schoolId, user.id);
    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    const { notificationId } = await request.json();
    const updated = await markNotificationAsRead(user.schoolId, student.id, notificationId);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed updating notification";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

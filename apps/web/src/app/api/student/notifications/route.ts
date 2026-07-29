import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getStudentProfileByUserId, getStudentNotifications, markNotificationAsRead } from "@apexium/db";

// GET /api/student/notifications — list notifications
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

    const notifications = await getStudentNotifications(user.schoolId, student.id);
    return NextResponse.json({ success: true, data: notifications });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch notifications";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/student/notifications — mark notification as read
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { notificationId } = await request.json();
    if (!notificationId) {
      return NextResponse.json({ success: false, error: "notificationId is required" }, { status: 400 });
    }

    const student = await getStudentProfileByUserId(user.schoolId, user.id);
    if (!student) {
      return NextResponse.json({ success: false, error: "Student profile not found" }, { status: 404 });
    }

    const updated = await markNotificationAsRead(user.schoolId, student.id, notificationId);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update notification";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

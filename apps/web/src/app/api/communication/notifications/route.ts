import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getUserNotifications, markCommNotificationAsRead } from "@apexium/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await getUserNotifications(user.id, user.schoolId);
    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const notif = await markCommNotificationAsRead(user.id, body.notificationId, user.schoolId);
    return NextResponse.json({ success: true, data: notif });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

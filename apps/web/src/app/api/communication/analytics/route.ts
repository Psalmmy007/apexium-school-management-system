import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getCommunicationAnalytics } from "@apexium/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const analytics = await getCommunicationAnalytics(user.schoolId);
    return NextResponse.json({ success: true, data: analytics });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

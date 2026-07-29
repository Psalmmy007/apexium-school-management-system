import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getParentChildren, getParentAnnouncements } from "@apexium/db";

// GET /api/parent/announcements
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "parent") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const children = await getParentChildren(user.schoolId, user.id);
    const classIds = children
      .map((c) => c?.classId)
      .filter((id): id is string => Boolean(id));

    const announcements = await getParentAnnouncements(user.schoolId, classIds);
    return NextResponse.json({ success: true, data: announcements });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch announcements";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { listAdmissionApplications } from "@apexium/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !user.schoolId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const desiredSession = searchParams.get("session") || undefined;
    const desiredClassId = searchParams.get("classId") || undefined;
    const search = searchParams.get("search") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const result = await listAdmissionApplications({
      schoolId: user.schoolId,
      status: status === "all" ? undefined : status,
      desiredSession,
      desiredClassId,
      search,
      cursor,
      limit,
    });

    return NextResponse.json({
      ...result,
      applications: result.data,
    });
  } catch (error: any) {
    console.error("Admin admissions list error:", error);
    return NextResponse.json({ error: error.message || "Failed to list applications" }, { status: 500 });
  }
}

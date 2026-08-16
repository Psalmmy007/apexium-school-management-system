import { NextResponse } from "next/server";
import { getSessionUser, isValidUUID } from "@/lib/auth/session";
import { db, subjects } from "@apexium/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isValidUUID(user.schoolId)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schoolSubjects = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
      })
      .from(subjects)
      .where(eq(subjects.schoolId, user.schoolId));

    return NextResponse.json({
      success: true,
      data: schoolSubjects,
    });
  } catch (error: any) {
    console.error("Failed to fetch subjects:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch subjects" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, classes, sections } from "@apexium/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schoolClasses = await db
      .select()
      .from(classes)
      .where(eq(classes.schoolId, user.schoolId));

    const schoolSections = await db
      .select()
      .from(sections)
      .where(eq(sections.schoolId, user.schoolId));

    return NextResponse.json({
      success: true,
      data: {
        classes: schoolClasses,
        sections: schoolSections,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch classes" },
      { status: 500 }
    );
  }
}

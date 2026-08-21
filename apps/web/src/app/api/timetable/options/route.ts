import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, classes, sections, subjects, periods, users } from "@apexium/db";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

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

    const schoolSubjects = await db
      .select()
      .from(subjects)
      .where(eq(subjects.schoolId, user.schoolId));

    const schoolPeriods = (await db
      .select()
      .from(periods)
      .where(eq(periods.schoolId, user.schoolId))).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const schoolTeachers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.schoolId, user.schoolId), eq(users.role, "teacher")));

    return NextResponse.json({
      success: true,
      data: {
        classes: schoolClasses,
        sections: schoolSections,
        subjects: schoolSubjects,
        periods: schoolPeriods,
        teachers: schoolTeachers,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch timetable options" },
      { status: 500 }
    );
  }
}

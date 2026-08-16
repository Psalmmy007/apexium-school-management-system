import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, classes, sections, students } from "@apexium/db";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schoolClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        code: classes.code,
        capacity: classes.capacity,
        studentCount: sql<number>`count(${students.id})::int`,
      })
      .from(classes)
      .leftJoin(
        students,
        and(eq(students.classId, classes.id), eq(students.status, "active"))
      )
      .where(eq(classes.schoolId, user.schoolId))
      .groupBy(classes.id, classes.name, classes.code, classes.capacity);

    const schoolSections = await db
      .select()
      .from(sections)
      .where(eq(sections.schoolId, user.schoolId));

    const totalSchoolStudents = schoolClasses.reduce(
      (acc, curr) => acc + (curr.studentCount || 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        classes: schoolClasses,
        sections: schoolSections,
        totalSchoolStudents,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch classes" },
      { status: 500 }
    );
  }
}


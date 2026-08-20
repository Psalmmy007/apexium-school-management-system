import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  db,
  users,
  classes,
  sections,
  timetableEntries,
  subjects,
  hrEmployees,
  registerStaffMember,
} from "@apexium/db";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch all users with role 'teacher'
    const teacherUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.schoolId, user.schoolId), eq(users.role, "teacher")));

    // 2. Fetch all classes and sections to map form teacher assignments
    const [allClasses, allSections, allTimetable, allSubjects, allHrEmployees] = await Promise.all([
      db.select().from(classes).where(eq(classes.schoolId, user.schoolId)),
      db.select().from(sections).where(eq(sections.schoolId, user.schoolId)),
      db.select().from(timetableEntries).where(eq(timetableEntries.schoolId, user.schoolId)),
      db.select().from(subjects).where(eq(subjects.schoolId, user.schoolId)),
      db.select().from(hrEmployees).where(eq(hrEmployees.schoolId, user.schoolId)),
    ]);

    // Build subject lookup
    const subjectMap = new Map<string, string>();
    allSubjects.forEach((s) => subjectMap.set(s.id, s.name));

    // Combine into rich teacher roster objects
    const teachersList = teacherUsers.map((t) => {
      // Find classes where this teacher is form teacher
      const assignedClasses = allClasses
        .filter((c) => c.classTeacherId === t.id)
        .map((c) => ({ id: c.id, name: c.name, type: "class" }));

      // Find sections where this teacher is section teacher
      const assignedSections = allSections
        .filter((s) => s.classTeacherId === t.id)
        .map((s) => ({ id: s.id, name: s.name, type: "section" }));

      // Find timetable periods taught
      const teacherPeriods = allTimetable.filter((entry) => entry.teacherId === t.id);
      const taughtSubjectNames = Array.from(
        new Set(teacherPeriods.map((p) => subjectMap.get(p.subjectId) || "Subject"))
      );

      // Find HR employee record
      const hrRecord = allHrEmployees.find(
        (e) => e.email?.toLowerCase() === t.email.toLowerCase()
      );

      return {
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        email: t.email,
        phone: hrRecord?.phone || null,
        employeeNumber: hrRecord?.employeeNumber || null,
        employmentStatus: hrRecord?.employmentStatus || "Active",
        formClasses: [...assignedClasses, ...assignedSections],
        taughtSubjects: taughtSubjectNames,
        periodsCount: teacherPeriods.length,
        isActive: t.isActive,
        createdAt: t.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        teachers: teachersList,
        classes: allClasses.map((c) => ({ id: c.id, name: c.name })),
        subjects: allSubjects.map((s) => ({ id: s.id, name: s.name })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch teachers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !user.schoolId || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized. Admin only." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, formClassId } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { success: false, error: "First name, last name, and email are required." },
        { status: 400 }
      );
    }

    // Unified staff creation across users and hrEmployees
    const { employee, userId } = await registerStaffMember({
      schoolId: user.schoolId,
      firstName,
      lastName,
      email,
      phone: phone || "",
      isTeachingStaff: true,
      formClassId: formClassId || undefined,
      performedById: user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Teacher ${firstName} ${lastName} added successfully.`,
      data: { id: userId, ...employee },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create teacher account" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !user.schoolId || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized. Admin only." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { teacherId, formClassId } = body;

    if (!teacherId) {
      return NextResponse.json({ success: false, error: "Teacher ID required" }, { status: 400 });
    }

    // Clear existing form class assignment if any
    await db
      .update(classes)
      .set({ classTeacherId: null, updatedAt: new Date() })
      .where(and(eq(classes.classTeacherId, teacherId), eq(classes.schoolId, user.schoolId)));

    // Assign new form class if provided
    if (formClassId) {
      await db
        .update(classes)
        .set({ classTeacherId: teacherId, updatedAt: new Date() })
        .where(and(eq(classes.id, formClassId), eq(classes.schoolId, user.schoolId)));
    }

    return NextResponse.json({
      success: true,
      message: "Form class assignment updated successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update teacher assignment" },
      { status: 500 }
    );
  }
}

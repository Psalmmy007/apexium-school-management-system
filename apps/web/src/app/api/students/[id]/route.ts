import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, students, classes, sections, studentGuardians, users } from "@apexium/db";
import { eq, and } from "drizzle-orm";

// ── GET /api/students/[id] — View student details ──────────────
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const studentId = params.id;

    // Fetch student with class and section details, strictly filtered by user's schoolId
    const [student] = await db
      .select({
        id: students.id,
        schoolId: students.schoolId,
        admissionNumber: students.admissionNumber,
        firstName: students.firstName,
        lastName: students.lastName,
        middleName: students.middleName,
        gender: students.gender,
        dateOfBirth: students.dateOfBirth,
        address: students.address,
        photoUrl: students.photoUrl,
        classId: students.classId,
        sectionId: students.sectionId,
        status: students.status,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
        className: classes.name,
        sectionName: sections.name,
      })
      .from(students)
      .leftJoin(classes, eq(students.classId, classes.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .where(and(eq(students.id, studentId), eq(students.schoolId, user.schoolId)));

    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    // Fetch guardians/parents
    const guardians = await db
      .select({
        id: studentGuardians.id,
        relationship: studentGuardians.relationship,
        isPrimary: studentGuardians.isPrimary,
        parentId: studentGuardians.parentId,
        parentFirstName: users.firstName,
        parentLastName: users.lastName,
        parentEmail: users.email,
      })
      .from(studentGuardians)
      .leftJoin(users, eq(studentGuardians.parentId, users.id))
      .where(
        and(
          eq(studentGuardians.studentId, studentId),
          eq(studentGuardians.schoolId, user.schoolId)
        )
      );

    return NextResponse.json({
      success: true,
      data: {
        ...student,
        guardians,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch student details" },
      { status: 500 }
    );
  }
}

// ── PUT /api/students/[id] — Update student ────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const studentId = params.id;
    const body = await request.json();

    const {
      admissionNumber,
      firstName,
      lastName,
      middleName,
      gender,
      dateOfBirth,
      address,
      photoUrl,
      classId,
      sectionId,
      status,
    } = body;

    // Verify student exists and belongs to school
    const [existing] = await db
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, user.schoolId)));

    if (!existing) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    // Check duplicate admission number if changing
    if (admissionNumber && admissionNumber !== existing.admissionNumber) {
      const duplicate = await db
        .select()
        .from(students)
        .where(
          and(
            eq(students.schoolId, user.schoolId),
            eq(students.admissionNumber, admissionNumber)
          )
        );

      if (duplicate.length > 0) {
        return NextResponse.json(
          { success: false, error: "A student with this admission number already exists in your school." },
          { status: 400 }
        );
      }
    }

    const [updatedStudent] = await db
      .update(students)
      .set({
        admissionNumber: admissionNumber ?? existing.admissionNumber,
        firstName: firstName ?? existing.firstName,
        lastName: lastName ?? existing.lastName,
        middleName: middleName !== undefined ? middleName : existing.middleName,
        gender: gender !== undefined ? gender : existing.gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : existing.dateOfBirth,
        address: address !== undefined ? address : existing.address,
        photoUrl: photoUrl !== undefined ? photoUrl : existing.photoUrl,
        classId: classId !== undefined ? classId : existing.classId,
        sectionId: sectionId !== undefined ? sectionId : existing.sectionId,
        status: status ?? existing.status,
        updatedAt: new Date(),
      })
      .where(and(eq(students.id, studentId), eq(students.schoolId, user.schoolId)))
      .returning();

    return NextResponse.json({ success: true, data: updatedStudent });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update student" },
      { status: 500 }
    );
  }
}

// ── DELETE /api/students/[id] — Delete student ─────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const studentId = params.id;

    const [deleted] = await db
      .delete(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, user.schoolId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Student deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete student" },
      { status: 500 }
    );
  }
}

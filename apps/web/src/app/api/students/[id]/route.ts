import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, students, classes, sections, getStudentGuardians, linkStudentGuardian } from "@apexium/db";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
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
        admissionDate: students.admissionDate,
        stateOfOrigin: students.stateOfOrigin,
        lga: students.lga,
        nationality: students.nationality,
        religion: students.religion,
        bloodGroup: students.bloodGroup,
        genotype: students.genotype,
        address: students.address,
        photoUrl: students.photoUrl,
        passportUrl: students.passportUrl,
        classId: students.classId,
        sectionId: students.sectionId,
        emergencyContactName: students.emergencyContactName,
        emergencyContactPhone: students.emergencyContactPhone,
        emergencyContactRelationship: students.emergencyContactRelationship,
        previousSchool: students.previousSchool,
        medicalConditions: students.medicalConditions,
        allergies: students.allergies,
        status: students.status,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
        className: classes.name,
        sectionName: sections.name,
      })
      .from(students)
      .leftJoin(classes, eq(students.classId, classes.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .where(and(eq(students.id, params.id), eq(students.schoolId, user.schoolId)))
      .limit(1);

    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    const guardiansList = await getStudentGuardians(user.schoolId, student.id);

    return NextResponse.json({
      success: true,
      data: {
        ...student,
        guardians: guardiansList,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { guardianId, guardianRelationship, ...updates } = body;

    const [updated] = await db
      .update(students)
      .set({
        ...(updates.firstName && { firstName: updates.firstName.trim() }),
        ...(updates.lastName && { lastName: updates.lastName.trim() }),
        ...(updates.middleName !== undefined && { middleName: updates.middleName }),
        ...(updates.gender !== undefined && { gender: updates.gender }),
        ...(updates.dateOfBirth && { dateOfBirth: new Date(updates.dateOfBirth) }),
        ...(updates.admissionDate && { admissionDate: new Date(updates.admissionDate) }),
        ...(updates.stateOfOrigin !== undefined && { stateOfOrigin: updates.stateOfOrigin }),
        ...(updates.lga !== undefined && { lga: updates.lga }),
        ...(updates.nationality !== undefined && { nationality: updates.nationality }),
        ...(updates.religion !== undefined && { religion: updates.religion }),
        ...(updates.bloodGroup !== undefined && { bloodGroup: updates.bloodGroup }),
        ...(updates.genotype !== undefined && { genotype: updates.genotype }),
        ...(updates.address !== undefined && { address: updates.address }),
        ...(updates.passportUrl !== undefined && { passportUrl: updates.passportUrl }),
        ...(updates.classId !== undefined && { classId: updates.classId }),
        ...(updates.sectionId !== undefined && { sectionId: updates.sectionId }),
        ...(updates.status && { status: updates.status }),
        ...(updates.emergencyContactName !== undefined && { emergencyContactName: updates.emergencyContactName }),
        ...(updates.emergencyContactPhone !== undefined && { emergencyContactPhone: updates.emergencyContactPhone }),
        ...(updates.medicalConditions !== undefined && { medicalConditions: updates.medicalConditions }),
        ...(updates.allergies !== undefined && { allergies: updates.allergies }),
        updatedAt: new Date(),
      })
      .where(and(eq(students.id, params.id), eq(students.schoolId, user.schoolId)))
      .returning();

    if (guardianId) {
      await linkStudentGuardian(user.schoolId, params.id, guardianId, guardianRelationship || "Father", true);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

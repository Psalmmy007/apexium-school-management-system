import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, getValidUserIdForAudit } from "@/lib/auth/session";
import { db, students, classes, sections, enforceStudentCap, linkStudentGuardian, studentActivityTimeline } from "@apexium/db";
import { eq, and, like, or, sql } from "drizzle-orm";

// ── GET /api/students — List students with filtering ──────────
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const classId = searchParams.get("classId");
  const sectionId = searchParams.get("sectionId");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  try {
    const conditions = [eq(students.schoolId, user.schoolId)];

    if (classId) {
      conditions.push(eq(students.classId, classId));
    }
    if (sectionId) {
      conditions.push(eq(students.sectionId, sectionId));
    }
    if (status) {
      conditions.push(eq(students.status, status as any));
    }
    if (query) {
      const searchPattern = `%${query}%`;
      conditions.push(
        or(
          like(students.firstName, searchPattern),
          like(students.lastName, searchPattern),
          like(students.admissionNumber, searchPattern)
        )!
      );
    }

    const whereClause = and(...conditions);

    const items = await db
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
        status: students.status,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
        className: classes.name,
        sectionName: sections.name,
      })
      .from(students)
      .leftJoin(classes, eq(students.classId, classes.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .where(whereClause)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch students" },
      { status: 500 }
    );
  }
}

// ── POST /api/students — Create student with full SIS fields ─
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      admissionNumber,
      firstName,
      lastName,
      middleName,
      gender,
      dateOfBirth,
      admissionDate,
      stateOfOrigin,
      lga,
      nationality,
      religion,
      bloodGroup,
      genotype,
      address,
      passportUrl,
      photoUrl,
      classId,
      sectionId,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      previousSchool,
      medicalConditions,
      allergies,
      hostelRoomId,
      hostelBedId,
      status,
      guardianId,
      guardianRelationship,
    } = body;

    if (!admissionNumber || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: "Admission number, first name, and last name are required." },
        { status: 400 }
      );
    }

    // License seat cap enforcement
    try {
      await enforceStudentCap(user.schoolId);
    } catch (capError: any) {
      return NextResponse.json(
        { success: false, error: capError.message || "Student seat cap reached for your active license plan." },
        { status: 403 }
      );
    }

    // Check duplicate admission number within the same school
    const existing = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.schoolId, user.schoolId),
          eq(students.admissionNumber, admissionNumber)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "A student with this admission number already exists in your school." },
        { status: 400 }
      );
    }

    // Biodata duplicate detection: check for same name + DOB to prevent duplicates
    if (firstName && lastName && dateOfBirth) {
      const bioDuplicate = await db
        .select({ id: students.id, admissionNumber: students.admissionNumber })
        .from(students)
        .where(
          and(
            eq(students.schoolId, user.schoolId),
            eq(students.firstName, firstName.trim()),
            eq(students.lastName, lastName.trim()),
            sql`DATE(${students.dateOfBirth}) = DATE(${new Date(dateOfBirth).toISOString()})`
          )
        )
        .limit(1);

      if (bioDuplicate.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `A student named "${firstName} ${lastName}" with the same date of birth already exists in your school (Admission No: ${bioDuplicate[0].admissionNumber}). Please verify this is not a duplicate admission.`,
            isDuplicate: true,
            existingStudentId: bioDuplicate[0].id,
          },
          { status: 409 }
        );
      }
    }

    const [newStudent] = await db
      .insert(students)
      .values({
        schoolId: user.schoolId,
        admissionNumber: admissionNumber.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName ? middleName.trim() : null,
        gender: gender || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
        stateOfOrigin: stateOfOrigin ? stateOfOrigin.trim() : null,
        lga: lga ? lga.trim() : null,
        nationality: nationality ? nationality.trim() : "Nigerian",
        religion: religion ? religion.trim() : null,
        bloodGroup: bloodGroup || null,
        genotype: genotype || null,
        address: address ? address.trim() : null,
        photoUrl: photoUrl || passportUrl || null,
        passportUrl: passportUrl || photoUrl || null,
        classId: classId || null,
        sectionId: sectionId || null,
        emergencyContactName: emergencyContactName ? emergencyContactName.trim() : null,
        emergencyContactPhone: emergencyContactPhone ? emergencyContactPhone.trim() : null,
        emergencyContactRelationship: emergencyContactRelationship ? emergencyContactRelationship.trim() : null,
        previousSchool: previousSchool ? previousSchool.trim() : null,
        medicalConditions: medicalConditions ? medicalConditions.trim() : null,
        allergies: allergies ? allergies.trim() : null,
        hostelRoomId: hostelRoomId || null,
        hostelBedId: hostelBedId || null,
        status: status || "active",
      })
      .returning();

    // Link guardian if provided
    if (guardianId) {
      await linkStudentGuardian(user.schoolId, newStudent.id, guardianId, guardianRelationship || "Father", true);
    }

    // Log admission event to activity timeline (with safe user FK resolution)
    const auditUserId = await getValidUserIdForAudit(user.id);
    await db.insert(studentActivityTimeline).values({
      schoolId: user.schoolId,
      studentId: newStudent.id,
      performedBy: auditUserId,
      eventType: "admission",
      description: `Student admitted: ${newStudent.firstName} ${newStudent.lastName} (${newStudent.admissionNumber})`,
      metadata: {
        admissionNumber: newStudent.admissionNumber,
        classId: newStudent.classId,
        sectionId: newStudent.sectionId,
        status: newStudent.status,
        guardianId: guardianId || null,
      },
    });

    return NextResponse.json({ success: true, data: newStudent }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create student" },
      { status: 500 }
    );
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, students, classes, sections } from "@apexium/db";
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

    // Query students with class and section names
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
      .where(whereClause)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // Total count
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

// ── POST /api/students — Create student ────────────────────────
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
      address,
      photoUrl,
      classId,
      sectionId,
      status,
    } = body;

    if (!admissionNumber || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: "Admission number, first name, and last name are required." },
        { status: 400 }
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

    const [newStudent] = await db
      .insert(students)
      .values({
        schoolId: user.schoolId,
        admissionNumber,
        firstName,
        lastName,
        middleName: middleName || null,
        gender: gender || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        address: address || null,
        photoUrl: photoUrl || null,
        classId: classId || null,
        sectionId: sectionId || null,
        status: status || "active",
      })
      .returning();

    return NextResponse.json({ success: true, data: newStudent }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create student" },
      { status: 500 }
    );
  }
}

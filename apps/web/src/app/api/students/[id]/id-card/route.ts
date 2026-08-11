import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, students, schools, classes, sections } from "@apexium/db";
import { eq, and } from "drizzle-orm";
import { canPerformAction } from "@/lib/auth/rbac";

/**
 * GET /api/students/[id]/id-card
 * Generates structured JSON payload for printable Student ID Card generation.
 * Contains student details, school branding, embedded QR code verification payload, and barcode representation.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || !canPerformAction(user.role, "generate_id_card")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const [student] = await db
      .select({
        id: students.id,
        admissionNumber: students.admissionNumber,
        firstName: students.firstName,
        lastName: students.lastName,
        middleName: students.middleName,
        gender: students.gender,
        dateOfBirth: students.dateOfBirth,
        bloodGroup: students.bloodGroup,
        passportUrl: students.passportUrl,
        photoUrl: students.photoUrl,
        emergencyContactPhone: students.emergencyContactPhone,
        status: students.status,
        className: classes.name,
        sectionName: sections.name,
      })
      .from(students)
      .leftJoin(classes, eq(students.classId, classes.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .where(and(eq(students.id, id), eq(students.schoolId, user.schoolId)));

    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found." }, { status: 404 });
    }

    const [school] = await db
      .select({
        name: schools.name,
        slug: schools.slug,
        logoUrl: schools.logoUrl,
        address: schools.address,
        phone: schools.phone,
      })
      .from(schools)
      .where(eq(schools.id, user.schoolId));

    const fullName = `${student.lastName}, ${student.firstName}${student.middleName ? ` ${student.middleName}` : ""}`;
    const photo = student.passportUrl || student.photoUrl || null;
    const currentYear = new Date().getFullYear();
    const expiryYear = currentYear + 1;

    // Structured verification payload for QR code
    const qrPayload = JSON.stringify({
      verifiableUrl: `https://apexium-school-management-system.vercel.app/verify/student/${student.id}`,
      studentId: student.id,
      admissionNumber: student.admissionNumber,
      schoolId: user.schoolId,
      issueYear: currentYear,
    });

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student.id,
          admissionNumber: student.admissionNumber,
          fullName,
          firstName: student.firstName,
          lastName: student.lastName,
          photoUrl: photo,
          classStream: `${student.className || "Unassigned"}${student.sectionName ? ` (${student.sectionName})` : ""}`,
          dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split("T")[0] : null,
          bloodGroup: student.bloodGroup || "N/A",
          emergencyPhone: student.emergencyContactPhone || "N/A",
          status: student.status,
        },
        school: {
          name: school?.name || "Apexium International School",
          logoUrl: school?.logoUrl || null,
          address: school?.address || "School Campus",
          phone: school?.phone || "N/A",
        },
        cardMetadata: {
          issueDate: `${currentYear}-09-01`,
          expiryDate: `${expiryYear}-08-31`,
          academicSession: `${currentYear}/${expiryYear}`,
          qrPayload,
          barcodeData: student.admissionNumber,
          template: "standard_enterprise_v1",
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate ID card payload" },
      { status: 500 }
    );
  }
}

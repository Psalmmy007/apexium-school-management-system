import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, students, studentActivityTimeline } from "@apexium/db";
import { eq, and } from "drizzle-orm";

/**
 * PATCH /api/students/[id]/status
 *
 * Change a student's status with a required reason.
 * Every change is permanently recorded in the activity timeline.
 *
 * Allowed statuses:
 *   active | inactive | suspended | withdrawn | expelled | graduated | transferred | alumni
 *
 * Body: { status: string, reason: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const body = await request.json();
    const { status, reason } = body;

    const validStatuses = [
      "active",
      "inactive",
      "suspended",
      "withdrawn",
      "expelled",
      "graduated",
      "transferred",
      "alumni",
    ];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "A reason is required when changing a student's status (minimum 3 characters)." },
        { status: 400 }
      );
    }

    // Fetch current student to confirm school ownership
    const [student] = await db
      .select({
        id: students.id,
        schoolId: students.schoolId,
        firstName: students.firstName,
        lastName: students.lastName,
        admissionNumber: students.admissionNumber,
        status: students.status,
      })
      .from(students)
      .where(and(eq(students.id, id), eq(students.schoolId, user.schoolId)));

    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found." }, { status: 404 });
    }

    if (student.status === status) {
      return NextResponse.json(
        { success: false, error: `Student is already ${status}.` },
        { status: 400 }
      );
    }

    const previousStatus = student.status;

    // Update student status
    const [updated] = await db
      .update(students)
      .set({ status: status as any, updatedAt: new Date() })
      .where(and(eq(students.id, id), eq(students.schoolId, user.schoolId)))
      .returning();

    // Log the status change to the activity timeline (immutable)
    await db.insert(studentActivityTimeline).values({
      schoolId: user.schoolId,
      studentId: id,
      performedBy: user.id,
      eventType: "status_change",
      description: `Status changed from "${previousStatus}" to "${status}". Reason: ${reason.trim()}`,
      metadata: {
        previousStatus,
        newStatus: status,
        reason: reason.trim(),
        changedBy: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Student status updated to "${status}" successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update student status" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/students/[id]/status
 * Returns the student's current status and full activity timeline.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const [student] = await db
      .select({
        id: students.id,
        schoolId: students.schoolId,
        firstName: students.firstName,
        lastName: students.lastName,
        admissionNumber: students.admissionNumber,
        status: students.status,
      })
      .from(students)
      .where(and(eq(students.id, id), eq(students.schoolId, user.schoolId)));

    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found." }, { status: 404 });
    }

    const timeline = await db
      .select()
      .from(studentActivityTimeline)
      .where(
        and(
          eq(studentActivityTimeline.studentId, id),
          eq(studentActivityTimeline.schoolId, user.schoolId)
        )
      )
      .orderBy(studentActivityTimeline.createdAt);

    return NextResponse.json({
      success: true,
      data: {
        student,
        timeline,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch student status" },
      { status: 500 }
    );
  }
}

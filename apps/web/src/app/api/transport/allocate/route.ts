import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { assignStudentToRoute, db, transportAssignments, students, transportRoutes } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db
      .select({
        id: transportAssignments.id,
        tripType: transportAssignments.tripType,
        assignedDate: transportAssignments.assignedDate,
        active: transportAssignments.active,
        studentId: students.id,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        admissionNumber: students.admissionNumber,
        routeName: transportRoutes.routeName,
        routeCode: transportRoutes.routeCode,
      })
      .from(transportAssignments)
      .leftJoin(students, eq(transportAssignments.studentId, students.id))
      .leftJoin(transportRoutes, eq(transportAssignments.routeId, transportRoutes.id))
      .where(eq(transportAssignments.schoolId, user.schoolId))
      .orderBy(desc(transportAssignments.assignedDate));

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "teacher") || !user.schoolId) {
    return NextResponse.json({ error: "Forbidden. Authorized staff access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const assignment = await assignStudentToRoute({
      schoolId: user.schoolId,
      studentId: body.studentId,
      routeId: body.routeId,
      stopId: body.stopId,
      tripType: body.tripType,
    });

    return NextResponse.json({ success: true, data: assignment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

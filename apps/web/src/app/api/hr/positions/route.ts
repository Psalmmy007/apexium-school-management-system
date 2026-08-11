import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createPosition, db, hrPositions, hrDepartments } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db
      .select({
        id: hrPositions.id,
        title: hrPositions.title,
        gradeLevel: hrPositions.gradeLevel,
        minSalary: hrPositions.minSalary,
        maxSalary: hrPositions.maxSalary,
        departmentName: hrDepartments.departmentName,
      })
      .from(hrPositions)
      .leftJoin(hrDepartments, eq(hrPositions.departmentId, hrDepartments.id))
      .where(eq(hrPositions.schoolId, user.schoolId))
      .orderBy(desc(hrPositions.createdAt));

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin" || !user.schoolId) {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const pos = await createPosition({
      schoolId: user.schoolId,
      departmentId: body.departmentId,
      title: body.title,
      gradeLevel: body.gradeLevel,
      minSalary: body.minSalary ? parseFloat(body.minSalary) : 0,
      maxSalary: body.maxSalary ? parseFloat(body.maxSalary) : 0,
    });

    return NextResponse.json({ success: true, data: pos });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

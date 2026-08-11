import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createDepartment, db, hrDepartments } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db
      .select()
      .from(hrDepartments)
      .where(eq(hrDepartments.schoolId, user.schoolId))
      .orderBy(desc(hrDepartments.createdAt));

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
    const dept = await createDepartment({
      schoolId: user.schoolId,
      departmentName: body.departmentName,
      code: body.code,
      description: body.description,
    });

    return NextResponse.json({ success: true, data: dept });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

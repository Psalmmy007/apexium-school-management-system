import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { executeBulkStudentActions } from "@apexium/db";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { studentIds, action, payload } = body;

    const result = await executeBulkStudentActions(user.schoolId, studentIds, action, payload);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

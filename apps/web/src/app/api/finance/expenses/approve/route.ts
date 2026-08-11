import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { approveAndPostExpense } from "@apexium/db";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin" || !user.schoolId) {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = await approveAndPostExpense(user.schoolId, body.expenseId, user.id);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { submitExpenseVoucher, db, financeExpenses } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const expenses = await db
      .select()
      .from(financeExpenses)
      .where(eq(financeExpenses.schoolId, user.schoolId))
      .orderBy(desc(financeExpenses.createdAt));

    return NextResponse.json({ success: true, data: expenses });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const exp = await submitExpenseVoucher({
      schoolId: user.schoolId,
      vendorName: body.vendorName,
      category: body.category,
      amount: parseFloat(body.amount),
      paymentMethod: body.paymentMethod,
      submittedBy: user.id,
      remarks: body.remarks,
    });

    return NextResponse.json({ success: true, data: exp });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

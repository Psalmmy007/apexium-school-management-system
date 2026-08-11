import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, financeBudgets, financeAccounts } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db
      .select({
        id: financeBudgets.id,
        allocatedAmount: financeBudgets.allocatedAmount,
        utilizedAmount: financeBudgets.utilizedAmount,
        accountName: financeAccounts.accountName,
        accountCode: financeAccounts.accountCode,
      })
      .from(financeBudgets)
      .leftJoin(financeAccounts, eq(financeBudgets.accountId, financeAccounts.id))
      .where(eq(financeBudgets.schoolId, user.schoolId))
      .orderBy(desc(financeBudgets.createdAt));

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
    const [budget] = await db
      .insert(financeBudgets)
      .values({
        schoolId: user.schoolId,
        fiscalYearId: body.fiscalYearId,
        accountId: body.accountId,
        allocatedAmount: parseFloat(body.allocatedAmount),
        utilizedAmount: 0,
      })
      .returning();

    return NextResponse.json({ success: true, data: budget });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

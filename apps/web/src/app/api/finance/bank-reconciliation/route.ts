import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { reconcileBankAccount, db, financeBankAccounts, financeBankReconciliations } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db
      .select()
      .from(financeBankAccounts)
      .where(eq(financeBankAccounts.schoolId, user.schoolId))
      .orderBy(desc(financeBankAccounts.createdAt));

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
    const rec = await reconcileBankAccount({
      schoolId: user.schoolId,
      bankAccountId: body.bankAccountId,
      statementDate: new Date(body.statementDate),
      statementEndingBalance: parseFloat(body.statementEndingBalance),
      reconciledById: user.id,
    });

    return NextResponse.json({ success: true, data: rec });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

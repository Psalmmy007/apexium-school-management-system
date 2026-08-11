import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { setupDefaultChartOfAccounts, db, financeAccounts } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await setupDefaultChartOfAccounts(user.schoolId);
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
    const [acc] = await db
      .insert(financeAccounts)
      .values({
        schoolId: user.schoolId,
        accountCode: body.accountCode,
        accountName: body.accountName,
        accountType: body.accountType,
        category: body.category || body.accountType,
        parentAccountId: body.parentAccountId,
      })
      .returning();

    return NextResponse.json({ success: true, data: acc });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

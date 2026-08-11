import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { generateTrialBalance, generateIncomeStatement, generateBalanceSheet } from "@apexium/db";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "trial_balance";

  try {
    if (type === "trial_balance") {
      const data = await generateTrialBalance(user.schoolId);
      return NextResponse.json({ success: true, data });
    }

    if (type === "income_statement") {
      const data = await generateIncomeStatement(user.schoolId);
      return NextResponse.json({ success: true, data });
    }

    if (type === "balance_sheet") {
      const data = await generateBalanceSheet(user.schoolId);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: "Invalid statement type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

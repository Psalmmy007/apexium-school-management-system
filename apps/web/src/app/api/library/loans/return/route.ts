import { NextRequest, NextResponse } from "next/server";
import { returnBookCopy } from "@apexium/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId = "default-school-id", loanId, returnCondition } = body;

    if (!loanId) {
      return NextResponse.json({ success: false, error: "Loan ID is required" }, { status: 400 });
    }

    const updated = await returnBookCopy(schoolId, loanId, returnCondition);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

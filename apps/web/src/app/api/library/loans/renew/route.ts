import { NextRequest, NextResponse } from "next/server";
import { renewLoan } from "@apexium/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId = "default-school-id", loanId } = body;

    if (!loanId) {
      return NextResponse.json({ success: false, error: "Loan ID is required" }, { status: 400 });
    }

    const renewed = await renewLoan(schoolId, loanId);
    return NextResponse.json({ success: true, data: renewed });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

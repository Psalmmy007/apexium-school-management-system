import { NextRequest, NextResponse } from "next/server";
import { borrowBookCopy, getLibraryReports } from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") || "default-school-id";

    const reports = await getLibraryReports(schoolId);
    return NextResponse.json({ success: true, data: reports });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId = "default-school-id", copyId, borrowerId, borrowerType = "student", issuedById } = body;

    if (!copyId || !borrowerId) {
      return NextResponse.json({ success: false, error: "Copy ID and Borrower ID are required" }, { status: 400 });
    }

    const loan = await borrowBookCopy(schoolId, copyId, borrowerId, borrowerType, issuedById);
    return NextResponse.json({ success: true, data: loan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { reserveBook } from "@apexium/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId = "default-school-id", bookId, reserverId, reserverType = "student" } = body;

    if (!bookId || !reserverId) {
      return NextResponse.json({ success: false, error: "Book ID and Reserver ID are required" }, { status: 400 });
    }

    const reservation = await reserveBook(schoolId, bookId, reserverId, reserverType);
    return NextResponse.json({ success: true, data: reservation });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

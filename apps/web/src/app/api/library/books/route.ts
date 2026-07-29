import { NextRequest, NextResponse } from "next/server";
import { searchLibraryBooks, createLibraryBook } from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") || "default-school-id";
    const query = searchParams.get("query") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const status = searchParams.get("status") || undefined;

    const books = await searchLibraryBooks(schoolId, { query, categoryId, status });
    return NextResponse.json({ success: true, data: books });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId = "default-school-id", ...bookInput } = body;

    if (!bookInput.title || !bookInput.author) {
      return NextResponse.json({ success: false, error: "Title and author are required" }, { status: 400 });
    }

    const created = await createLibraryBook(schoolId, bookInput);
    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

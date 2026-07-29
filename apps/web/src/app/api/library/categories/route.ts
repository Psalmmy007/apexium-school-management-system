import { NextRequest, NextResponse } from "next/server";
import { listLibraryCategories, createLibraryCategory } from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") || "default-school-id";

    const categories = await listLibraryCategories(schoolId);
    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId = "default-school-id", name, code, description } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Category name is required" }, { status: 400 });
    }

    const category = await createLibraryCategory(schoolId, name, code, description);
    return NextResponse.json({ success: true, data: category });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { searchPublicSchoolDirectory } from "@apexium/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();
    const state = (searchParams.get("state") || "").trim();
    const city = (searchParams.get("city") || "").trim();
    const schoolType = (searchParams.get("schoolType") || "").trim();
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const offsetParam = parseInt(searchParams.get("offset") || "0", 10);

    const result = await searchPublicSchoolDirectory({
      query: query || undefined,
      state: state || undefined,
      city: city || undefined,
      schoolType: schoolType || undefined,
      limit: limitParam,
      offset: offsetParam,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error searching school directory:", error);
    return NextResponse.json({ error: "Failed to search school directory" }, { status: 500 });
  }
}

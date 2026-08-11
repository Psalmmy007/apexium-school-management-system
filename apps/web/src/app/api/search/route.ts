import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { globalSearchEntities } from "@apexium/db";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  try {
    const results = await globalSearchEntities(user.schoolId, q);
    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

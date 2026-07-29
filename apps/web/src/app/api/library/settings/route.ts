import { NextRequest, NextResponse } from "next/server";
import { getLibrarySettings, upsertLibrarySettings } from "@apexium/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") || "default-school-id";

    const settings = await getLibrarySettings(schoolId);
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId = "default-school-id", ...settingsInput } = body;

    const updated = await upsertLibrarySettings(schoolId, settingsInput);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

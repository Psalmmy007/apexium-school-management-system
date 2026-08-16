import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, isValidUUID } from "@/lib/auth/session";
import { getSchoolGeneralSettings, updateSchoolGeneralSettings } from "@apexium/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "platform_operator")) {
    return NextResponse.json({ success: false, error: "Unauthorized. Administrator access required." }, { status: 401 });
  }

  const schoolId = user.schoolId;
  if (!isValidUUID(schoolId)) {
    return NextResponse.json({ success: false, error: "No active school associated with session." }, { status: 400 });
  }

  try {
    const school = await getSchoolGeneralSettings(schoolId);
    if (!school) {
      return NextResponse.json({ success: false, error: "School profile not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: school,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed retrieving school settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "platform_operator")) {
    return NextResponse.json({ success: false, error: "Unauthorized. Administrator access required." }, { status: 401 });
  }

  const schoolId = user.schoolId;
  if (!isValidUUID(schoolId)) {
    return NextResponse.json({ success: false, error: "No active school associated with session." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, address, phone, email, motto, logoUrl } = body;

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ success: false, error: "School Name cannot be empty." }, { status: 400 });
    }

    const updated = await updateSchoolGeneralSettings(schoolId, {
      name,
      address,
      phone,
      email,
      motto,
      logoUrl,
    });

    return NextResponse.json({
      success: true,
      message: "School settings updated successfully.",
      data: updated,
    });
  } catch (error: any) {
    console.error("[api/settings/school] Update error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed updating school settings" }, { status: 500 });
  }
}

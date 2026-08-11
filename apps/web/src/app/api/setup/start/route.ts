import { NextResponse } from "next/server";
import { createSchoolWithTenant, provisionFirstAdminUser } from "@apexium/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { schoolName, adminEmail, adminFirstName, adminLastName, motto, phone } = body;

    if (!schoolName || !adminEmail) {
      return NextResponse.json({ error: "School name and admin email are required" }, { status: 400 });
    }

    const school = await createSchoolWithTenant({
      name: schoolName,
      motto: motto || "Excellence & Character",
      phone: phone || "+2348000000000",
      email: adminEmail,
    });

    const admin = await provisionFirstAdminUser(school.id, {
      email: adminEmail,
      firstName: adminFirstName || "School",
      lastName: adminLastName || "Administrator",
    });

    return NextResponse.json({
      success: true,
      message: "School tenant provisioned successfully",
      school,
      admin,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

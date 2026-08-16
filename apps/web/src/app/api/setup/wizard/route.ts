import { NextResponse } from "next/server";
import { getSessionUser, isValidUUID } from "@/lib/auth/session";
import { executeCoreSchoolSetup, resolveOrProvisionSchoolForAdmin } from "@apexium/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "platform_operator")) {
    return NextResponse.json({ success: false, error: "Unauthorized. Admin privileges required." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      sessionName,
      terms,
      classNames,
      departmentNames,
      subjects,
      gradeBands,
      schoolName,
      schoolEmail,
      address,
      phone,
      motto,
      adminFirstName,
      adminLastName,
      adminEmail,
    } = body;

    // Resiliently resolve or provision the school tenant entity
    const targetSchool = await resolveOrProvisionSchoolForAdmin({
      userId: user.id,
      currentSchoolId: user.schoolId,
      schoolName,
      schoolEmail,
      address,
      phone,
      motto,
      adminFirstName: adminFirstName || user.firstName,
      adminLastName: adminLastName || user.lastName,
      adminEmail: adminEmail || user.email,
    });

    const result = await executeCoreSchoolSetup({
      schoolId: targetSchool.id,
      sessionName,
      terms,
      classNames,
      departmentNames,
      subjects,
      gradeBands,
    });

    return NextResponse.json({
      success: true,
      message: "School core setup completed successfully.",
      schoolId: targetSchool.id,
      school: targetSchool,
      summary: result,
      data: result,
    });
  } catch (error: any) {
    console.error("Setup wizard error:", error);
    return NextResponse.json({ success: false, error: error.message || "Setup wizard failed" }, { status: 500 });
  }
}



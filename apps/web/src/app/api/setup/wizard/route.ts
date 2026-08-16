import { NextResponse } from "next/server";
import { getSessionUser, isValidUUID } from "@/lib/auth/session";
import { executeCoreSchoolSetup } from "@apexium/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = user.schoolId;
  if (!isValidUUID(schoolId)) {
    return NextResponse.json(
      { success: false, error: "No active school tenant context found to configure." },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { sessionName, terms, classNames, departmentNames, subjects, gradeBands } = body;

    const result = await executeCoreSchoolSetup({
      schoolId,
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
      summary: result,
      data: result,
    });
  } catch (error: any) {
    console.error("Setup wizard error:", error);
    return NextResponse.json({ success: false, error: error.message || "Setup wizard failed" }, { status: 500 });
  }
}


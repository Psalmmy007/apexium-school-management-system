import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { convertApplicantToStudent } from "@apexium/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user || !user.schoolId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { admissionNumber, classId } = body;

    const result = await convertApplicantToStudent({
      applicationId: params.id,
      schoolId: user.schoolId,
      adminId: user.id,
      admissionNumber: admissionNumber || undefined,
      classId: classId || undefined,
    });

    return NextResponse.json({
      success: true,
      student: result.student,
      guardian: result.guardian,
      application: result.application,
    });
  } catch (error: any) {
    console.error("Enrollment conversion error:", error);
    return NextResponse.json({ error: error.message || "Failed to enroll applicant" }, { status: 500 });
  }
}

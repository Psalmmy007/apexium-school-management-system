import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAdmissionApplication, detectDuplicateApplication } from "@apexium/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user || !user.schoolId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const application = await getAdmissionApplication(params.id, user.schoolId);
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const duplicates = await detectDuplicateApplication({
      schoolId: user.schoolId,
      guardianEmail: application.guardianEmail,
      guardianPhone: application.guardianPhone,
      firstName: application.firstName,
      lastName: application.lastName,
      dateOfBirth: application.dateOfBirth,
    });

    // Filter out self from duplicates
    const otherDuplicates = duplicates.filter((d) => d.application.id !== application.id);

    return NextResponse.json({
      application,
      potentialDuplicates: otherDuplicates,
    });
  } catch (error: any) {
    console.error("Admin application detail error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch application details" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSessionUser, isValidUUID } from "@/lib/auth/session";
import { completeSetupWizardOnboarding } from "@apexium/db";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = user.schoolId;
  if (!isValidUUID(schoolId)) {
    return NextResponse.json(
      { error: "No active school tenant context found to complete onboarding." },
      { status: 400 }
    );
  }

  try {
    const result = await completeSetupWizardOnboarding(schoolId);
    return NextResponse.json({
      success: true,
      message: "Onboarding completed! All ERP modules are now unlocked.",
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

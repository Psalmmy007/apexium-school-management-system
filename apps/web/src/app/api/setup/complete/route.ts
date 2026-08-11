import { NextResponse } from "next/server";
import { getSessionUser, isValidUUID } from "@/lib/auth/session";
import { completeSchoolOnboarding, db, schools } from "@apexium/db";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let schoolId = user.schoolId;
  if (!isValidUUID(schoolId)) {
    const [firstSchool] = await db.select().from(schools).limit(1);
    if (firstSchool && isValidUUID(firstSchool.id)) {
      schoolId = firstSchool.id;
    } else {
      return NextResponse.json({ error: "No active school found to complete onboarding." }, { status: 400 });
    }
  }

  try {
    const result = await completeSchoolOnboarding(schoolId);
    return NextResponse.json({
      success: true,
      message: "Onboarding completed! All ERP modules are now unlocked.",
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

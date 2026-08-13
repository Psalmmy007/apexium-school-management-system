import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  reviewAdmissionApplication,
  shortlistApplicant,
  waitlistApplicant,
  acceptApplicant,
  rejectApplicant,
  withdrawApplication,
} from "@apexium/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user || !user.schoolId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, reason } = body;

    let updated;
    switch (action) {
      case "review":
        updated = await reviewAdmissionApplication(params.id, user.schoolId, user.id);
        break;
      case "shortlist":
        updated = await shortlistApplicant(params.id, user.schoolId, user.id);
        break;
      case "waitlist":
        updated = await waitlistApplicant(params.id, user.schoolId, user.id, reason || "Waitlisted");
        break;
      case "accept":
        updated = await acceptApplicant(params.id, user.schoolId, user.id);
        break;
      case "reject":
        updated = await rejectApplicant(params.id, user.schoolId, user.id, reason || "Application rejected");
        break;
      case "withdraw":
        updated = await withdrawApplication(params.id, user.schoolId);
        break;
      default:
        return NextResponse.json({ error: `Invalid status action: ${action}` }, { status: 400 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Failed to update status or application not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, application: updated });
  } catch (error: any) {
    console.error("Admin status transition error:", error);
    return NextResponse.json({ error: error.message || "Failed to transition status" }, { status: 500 });
  }
}

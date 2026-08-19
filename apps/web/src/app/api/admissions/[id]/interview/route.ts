import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { scheduleInterview, recordInterviewOutcome } from "@apexium/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user || !user.schoolId) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const body = await req.json();
    const { interviewDate, interviewLocation, interviewNotes, interviewScore } = body;

    if (interviewDate) {
      const updated = await scheduleInterview({
        applicationId: params.id,
        schoolId: user.schoolId,
        interviewDate: new Date(interviewDate),
        interviewLocation,
        adminId: user.id,
      });
      return NextResponse.json({ success: true, application: updated });
    }

    if (interviewNotes !== undefined || interviewScore !== undefined) {
      const updated = await recordInterviewOutcome({
        applicationId: params.id,
        schoolId: user.schoolId,
        interviewNotes: interviewNotes || "",
        interviewScore: interviewScore !== undefined ? Number(interviewScore) : undefined,
        adminId: user.id,
      });
      return NextResponse.json({ success: true, application: updated });
    }

    return NextResponse.json({ error: "Missing interview parameters." }, { status: 400 });
  } catch (error: any) {
    console.error("Admissions interview error:", error);
    return NextResponse.json({ error: error.message || "Failed to update interview" }, { status: 500 });
  }
}

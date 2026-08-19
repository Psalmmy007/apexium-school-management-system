import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAdmissionStatistics } from "@apexium/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !user.schoolId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getAdmissionStatistics(user.schoolId);
    const byStatus = stats.byStatus || {};
    return NextResponse.json({
      ...stats,
      total: stats.total || 0,
      submitted: byStatus["submitted"] || 0,
      underReview: byStatus["under_review"] || 0,
      shortlisted: byStatus["shortlisted"] || 0,
      accepted: byStatus["accepted"] || 0,
      waitlisted: byStatus["waitlisted"] || 0,
      rejected: byStatus["rejected"] || 0,
      enrolled: byStatus["enrolled"] || 0,
      conversionRate: `${stats.conversionRate ? stats.conversionRate.toFixed(1) : "0"}%`,
    });
  } catch (error: any) {
    console.error("Admin admissions stats error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch stats" }, { status: 500 });
  }
}

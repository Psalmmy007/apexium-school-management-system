import { NextResponse } from "next/server";
import { getSessionUser, isValidUUID } from "@/lib/auth/session";
import { db, terms } from "@apexium/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isValidUUID(user.schoolId)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schoolTerms = await db
      .select({
        id: terms.id,
        name: terms.name,
        session: terms.session,
        isCurrent: terms.isCurrent,
        startDate: terms.startDate,
        endDate: terms.endDate,
        status: terms.status,
      })
      .from(terms)
      .where(eq(terms.schoolId, user.schoolId));

    return NextResponse.json({
      success: true,
      data: schoolTerms,
    });
  } catch (error: any) {
    console.error("Failed to fetch terms:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch terms" }, { status: 500 });
  }
}

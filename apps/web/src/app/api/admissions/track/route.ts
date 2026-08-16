import { NextRequest, NextResponse } from "next/server";
import { db, schools, getAdmissionApplicationByReference } from "@apexium/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference");
    const email = searchParams.get("email");
    const slug = searchParams.get("slug");

    const headerSlug = req.headers.get("x-apexium-tenant-slug");
    const targetSlug = headerSlug || slug;

    if (!reference || !email) {
      return NextResponse.json({ error: "Reference number and guardian email required" }, { status: 400 });
    }

    let schoolId: string | undefined;
    if (targetSlug) {
      const [school] = await db.select().from(schools).where(eq(schools.slug, targetSlug)).limit(1);
      if (school) schoolId = school.id;
    }

    // If schoolId was resolved, look up scoped by schoolId; otherwise look up by reference globally
    const app = schoolId
      ? await getAdmissionApplicationByReference(reference.trim(), schoolId)
      : null;

    if (!app || app.guardianEmail.toLowerCase().trim() !== email.toLowerCase().trim()) {
      return NextResponse.json({ error: "Application not found or verification mismatch" }, { status: 404 });
    }

    // Return safe tracking details only (no internal notes, decisionBy, etc.)
    return NextResponse.json({
      applicationReference: app.applicationReference,
      firstName: app.firstName,
      lastName: app.lastName,
      status: app.status,
      submittedAt: app.submittedAt,
      desiredSession: app.desiredSession,
      guardianEmail: app.guardianEmail,
    });
  } catch (error: any) {
    console.error("Admissions tracking error:", error);
    return NextResponse.json({ error: error.message || "Failed to track application" }, { status: 500 });
  }
}

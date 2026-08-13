import { NextRequest, NextResponse } from "next/server";
import { db, schools, createAdmissionApplication, submitAdmissionApplication, detectDuplicateApplication } from "@apexium/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      slug,
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      nationality,
      currentSchool,
      previousAcademicInfo,
      desiredClassId,
      desiredSession,
      desiredTermId,
      guardianName,
      guardianRelationship,
      guardianEmail,
      guardianPhone,
      guardianAddress,
      declarationConsent,
    } = body;

    // Tenant resolution: use header x-apexium-tenant-slug or body.slug
    const headerSlug = req.headers.get("x-apexium-tenant-slug");
    const targetSlug = headerSlug || slug;

    if (!targetSlug) {
      return NextResponse.json({ error: "School subdomain context required" }, { status: 400 });
    }

    const [school] = await db.select().from(schools).where(eq(schools.slug, targetSlug)).limit(1);
    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    if (!firstName || !lastName || !dateOfBirth || !gender || !guardianName || !guardianEmail || !guardianPhone) {
      return NextResponse.json({ error: "Missing required application fields" }, { status: 400 });
    }

    if (!declarationConsent) {
      return NextResponse.json({ error: "You must consent to the declaration to submit" }, { status: 400 });
    }

    const parsedDob = new Date(dateOfBirth);

    // Create DRAFT application
    const app = await createAdmissionApplication({
      schoolId: school.id,
      firstName,
      middleName,
      lastName,
      dateOfBirth: parsedDob,
      gender,
      nationality: nationality || "Nigerian",
      currentSchool,
      previousAcademicInfo,
      desiredClassId: desiredClassId || undefined,
      desiredSession: desiredSession || undefined,
      desiredTermId: desiredTermId || undefined,
      guardianName,
      guardianRelationship: guardianRelationship || "guardian",
      guardianEmail,
      guardianPhone,
      guardianAddress,
      source: "online",
    });

    // Check potential duplicates
    const duplicates = await detectDuplicateApplication({
      schoolId: school.id,
      guardianEmail,
      guardianPhone,
      firstName,
      lastName,
      dateOfBirth: parsedDob,
    });

    // Immediately submit application from draft -> submitted
    const submittedApp = await submitAdmissionApplication(app.id, school.id);

    return NextResponse.json({
      success: true,
      application: submittedApp,
      potentialDuplicateCount: duplicates.length,
    });
  } catch (error: any) {
    console.error("Admissions apply error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit application" }, { status: 500 });
  }
}

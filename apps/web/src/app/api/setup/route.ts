import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, isValidUUID } from "@/lib/auth/session";
import {
  db,
  schools,
  terms,
  academicSections,
  classes,
  sections,
  subjects,
  createAcademicSection,
  createClass,
  createStream,
  executeCoreSchoolSetup,
} from "@apexium/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    let activeSchoolId = user.schoolId;
    if (!activeSchoolId || !isValidUUID(activeSchoolId)) {
      return NextResponse.json({ success: false, error: "No school associated with user session" }, { status: 400 });
    }

    const [school] = await db.select().from(schools).where(eq(schools.id, activeSchoolId)).limit(1);

    if (!school) {
      return NextResponse.json({ success: false, error: "School not found" }, { status: 404 });
    }

    const existingClasses = await db.select().from(classes).where(eq(classes.schoolId, activeSchoolId));
    const existingTerms = await db.select().from(terms).where(eq(terms.schoolId, activeSchoolId));
    const existingSubjects = await db.select().from(subjects).where(eq(subjects.schoolId, activeSchoolId));

    const isConfigured = existingClasses.length > 0 && existingTerms.length > 0;

    return NextResponse.json({
      success: true,
      data: {
        school,
        isConfigured,
        totalClasses: existingClasses.length,
        totalTerms: existingTerms.length,
        totalSubjects: existingSubjects.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      sessionName = "2025/2026",
      schoolName,
      address,
      phone,
      terms: customTerms,
      classNames,
      departmentNames,
      subjects: customSubjects,
      gradeBands,
    } = body;

    let activeSchoolId = user.schoolId;
    if (!activeSchoolId || !isValidUUID(activeSchoolId)) {
      return NextResponse.json({ success: false, error: "No school associated with user session" }, { status: 400 });
    }

    let [school] = await db.select().from(schools).where(eq(schools.id, activeSchoolId)).limit(1);

    if (!school) {
      return NextResponse.json({ success: false, error: "School not found" }, { status: 404 });
    }

    if (schoolName) {
      await db
        .update(schools)
        .set({
          name: schoolName,
          ...(address && { address }),
          ...(phone && { phone }),
          updatedAt: new Date(),
        })
        .where(eq(schools.id, activeSchoolId));
    }

    const result = await executeCoreSchoolSetup({
      schoolId: activeSchoolId,
      sessionName,
      terms: customTerms,
      classNames,
      departmentNames,
      subjects: customSubjects,
      gradeBands,
    });

    return NextResponse.json({
      success: true,
      message: "First-time school setup completed successfully!",
      data: result,
      summary: result,
    });
  } catch (error: any) {
    console.error("Setup API Error:", error);
    let message = error.message || "Failed running school setup";
    if (error.code === "ECONNREFUSED" || message.includes("ECONNREFUSED")) {
      message = "Database connection refused. Please ensure the DATABASE_URL environment variable is configured in your Vercel project settings.";
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
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
} from "@apexium/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [school] = await db.select().from(schools).where(eq(schools.id, user.schoolId)).limit(1);
    const existingClasses = await db.select().from(classes).where(eq(classes.schoolId, user.schoolId));
    const existingTerms = await db.select().from(terms).where(eq(terms.schoolId, user.schoolId));
    const existingSubjects = await db.select().from(subjects).where(eq(subjects.schoolId, user.schoolId));

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
    const { template = "standard_k12", sessionName = "2025/2026", schoolName, address, phone } = body;

    // 1. Update School Profile if provided
    if (schoolName) {
      await db
        .update(schools)
        .set({
          name: schoolName,
          ...(address && { address }),
          ...(phone && { phone }),
          updatedAt: new Date(),
        })
        .where(eq(schools.id, user.schoolId));
    }

    // 2. Initialize Terms if none exist
    const existingTerms = await db.select().from(terms).where(eq(terms.schoolId, user.schoolId));
    if (existingTerms.length === 0) {
      await db.insert(terms).values([
        { schoolId: user.schoolId, name: "First Term", session: sessionName, isCurrent: true, status: "active" },
        { schoolId: user.schoolId, name: "Second Term", session: sessionName, isCurrent: false, status: "active" },
        { schoolId: user.schoolId, name: "Third Term", session: sessionName, isCurrent: false, status: "active" },
      ]);
    }

    // 3. Batch Create Academic Sections, Classes, Arms, and Subjects using K-12 Standard Template
    if (template === "standard_k12") {
      const existingSections = await db.select().from(academicSections).where(eq(academicSections.schoolId, user.schoolId));
      if (existingSections.length === 0) {
        // Sections
        const jss = await createAcademicSection(user.schoolId, { name: "Junior Secondary", code: "JSS", displayOrder: 1 });
        const sss = await createAcademicSection(user.schoolId, { name: "Senior Secondary", code: "SSS", displayOrder: 2 });

        // JSS Classes
        const jss1 = await createClass(user.schoolId, { sectionId: jss.id, name: "JSS 1", code: "JSS1", capacity: 40, displayOrder: 1 });
        const jss2 = await createClass(user.schoolId, { sectionId: jss.id, name: "JSS 2", code: "JSS2", capacity: 40, displayOrder: 2 });

        // SSS Classes
        const ss1 = await createClass(user.schoolId, { sectionId: sss.id, name: "SS 1", code: "SS1", capacity: 40, displayOrder: 3 });
        const ss2 = await createClass(user.schoolId, { sectionId: sss.id, name: "SS 2", code: "SS2", capacity: 40, displayOrder: 4 });

        // Streams/Arms
        await createStream(user.schoolId, { classId: jss1.id, name: "Gold Stream", capacity: 20, displayOrder: 1 });
        await createStream(user.schoolId, { classId: jss1.id, name: "Silver Stream", capacity: 20, displayOrder: 2 });
        await createStream(user.schoolId, { classId: ss1.id, name: "Science Stream", capacity: 20, displayOrder: 1 });
        await createStream(user.schoolId, { classId: ss1.id, name: "Arts Stream", capacity: 20, displayOrder: 2 });
      }

      // Default Subjects
      const existingSubjects = await db.select().from(subjects).where(eq(subjects.schoolId, user.schoolId));
      if (existingSubjects.length === 0) {
        await db.insert(subjects).values([
          { schoolId: user.schoolId, name: "Mathematics", code: "MTH" },
          { schoolId: user.schoolId, name: "English Language", code: "ENG" },
          { schoolId: user.schoolId, name: "Basic Science", code: "BSC" },
          { schoolId: user.schoolId, name: "Physics", code: "PHY" },
          { schoolId: user.schoolId, name: "Chemistry", code: "CHM" },
          { schoolId: user.schoolId, name: "Biology", code: "BIO" },
        ]);
      }
    }

    return NextResponse.json({ success: true, message: "First-time school setup completed successfully!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

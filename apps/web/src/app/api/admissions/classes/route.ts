import { NextRequest, NextResponse } from "next/server";
import { db, schools, classes } from "@apexium/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const headerSlug = req.headers.get("x-apexium-tenant-slug");
    const targetSlug = headerSlug || slug;

    if (!targetSlug) {
      return NextResponse.json({ error: "School subdomain required" }, { status: 400 });
    }

    const [school] = await db.select().from(schools).where(eq(schools.slug, targetSlug)).limit(1);
    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const classList = await db
      .select({ id: classes.id, name: classes.name })
      .from(classes)
      .where(eq(classes.schoolId, school.id));

    return NextResponse.json({ classes: classList, schoolName: school.name });
  } catch (error: any) {
    console.error("Admissions classes endpoint error:", error);
    return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db, schools } from "@apexium/db";
import { ilike, or, eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ schools: [] });
    }

    const matchedSchools = await db
      .select({
        id: schools.id,
        name: schools.name,
        slug: schools.slug,
        address: schools.address,
        logoUrl: schools.logoUrl,
      })
      .from(schools)
      .where(
        or(
          ilike(schools.name, `%${query}%`),
          ilike(schools.address, `%${query}%`),
          ilike(schools.slug, `%${query}%`)
        )
      )
      .limit(8);

    return NextResponse.json({ schools: matchedSchools });
  } catch (error: any) {
    console.error("Error searching schools:", error);
    return NextResponse.json({ error: "Failed to search schools" }, { status: 500 });
  }
}

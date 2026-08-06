import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db, students } from "@apexium/db";
import { eq, and, like, desc, sql } from "drizzle-orm";

/**
 * GET /api/students/admission-number
 *
 * Auto-generates the next sequential admission number for the school.
 * Format: SCHOOL_PREFIX/YEAR/SEQ (e.g. APX/2026/001)
 * The prefix is derived from the school slug (first 3 chars, uppercased).
 * The sequence is based on the highest existing number for this year + 1.
 *
 * Query params:
 *   prefix  — optional override prefix (e.g. "SCH")
 *   year    — optional year override (e.g. "2025")
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") || new Date().getFullYear().toString();
    const prefix = (searchParams.get("prefix") || "ADM").toUpperCase().slice(0, 6);

    // Find the highest existing admission number matching this school + year
    // Pattern: prefix/year/NNN or prefix-year-NNN etc — we look for numbers ending in /year/
    const pattern = `${prefix}/${year}/%`;

    const existing = await db
      .select({ admissionNumber: students.admissionNumber })
      .from(students)
      .where(
        and(
          eq(students.schoolId, user.schoolId),
          like(students.admissionNumber, pattern)
        )
      )
      .orderBy(desc(students.admissionNumber));

    let nextSeq = 1;

    if (existing.length > 0) {
      // Extract the trailing sequence number from the last admission number
      const lastNum = existing[0].admissionNumber;
      const parts = lastNum.split("/");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      } else {
        // Also check count as fallback
        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(students)
          .where(eq(students.schoolId, user.schoolId));
        nextSeq = Number(countResult?.count || 0) + 1;
      }
    }

    // Zero-pad to at least 3 digits
    const seqPadded = String(nextSeq).padStart(3, "0");
    const admissionNumber = `${prefix}/${year}/${seqPadded}`;

    return NextResponse.json({
      success: true,
      data: {
        admissionNumber,
        prefix,
        year,
        sequence: nextSeq,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate admission number" },
      { status: 500 }
    );
  }
}

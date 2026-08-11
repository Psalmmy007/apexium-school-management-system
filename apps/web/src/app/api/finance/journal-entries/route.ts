import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { postJournalEntry, db, financeJournalEntries, financeJournalLines } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const entries = await db
      .select()
      .from(financeJournalEntries)
      .where(eq(financeJournalEntries.schoolId, user.schoolId))
      .orderBy(desc(financeJournalEntries.createdAt));

    const entriesWithLines = await Promise.all(
      entries.map(async (e) => {
        const lines = await db
          .select()
          .from(financeJournalLines)
          .where(eq(financeJournalLines.journalEntryId, e.id));
        return { ...e, lines };
      })
    );

    return NextResponse.json({ success: true, data: entriesWithLines });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin" || !user.schoolId) {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const entry = await postJournalEntry({
      schoolId: user.schoolId,
      entryNumber: body.entryNumber,
      entryDate: body.entryDate ? new Date(body.entryDate) : undefined,
      referenceType: body.referenceType || "manual",
      description: body.description,
      postedById: user.id,
      lines: body.lines,
    });

    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

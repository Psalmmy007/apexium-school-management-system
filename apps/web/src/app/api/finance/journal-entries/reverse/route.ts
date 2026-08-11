import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { reverseJournalEntry } from "@apexium/db";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin" || !user.schoolId) {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const reversal = await reverseJournalEntry(user.schoolId, body.journalEntryId, user.id, body.reason || "Manual reversal");
    return NextResponse.json({ success: true, data: reversal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

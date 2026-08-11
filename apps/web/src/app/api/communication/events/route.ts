import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { emitDomainEvent } from "@apexium/db";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const eventRecord = await emitDomainEvent({
      schoolId: user.schoolId,
      eventType: body.eventType,
      entityId: body.entityId,
      payload: body.payload || {},
      recipientUserIds: body.recipientUserIds,
    });

    return NextResponse.json({ success: true, data: eventRecord });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

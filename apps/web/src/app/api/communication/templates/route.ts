import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { setupDefaultNotificationTemplates, db, commNotificationTemplates } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const templates = await setupDefaultNotificationTemplates(user.schoolId);
    return NextResponse.json({ success: true, data: templates });
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
    const [tpl] = await db
      .insert(commNotificationTemplates)
      .values({
        schoolId: user.schoolId,
        name: body.name,
        code: body.code,
        channel: body.channel || "in_app",
        subjectTemplate: body.subjectTemplate,
        bodyTemplate: body.bodyTemplate,
        active: true,
      })
      .returning();

    return NextResponse.json({ success: true, data: tpl });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

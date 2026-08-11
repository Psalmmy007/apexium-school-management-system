import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { publishAnnouncement, db, commAnnouncements } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db
      .select()
      .from(commAnnouncements)
      .where(eq(commAnnouncements.schoolId, user.schoolId))
      .orderBy(desc(commAnnouncements.createdAt));

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const ann = await publishAnnouncement({
      schoolId: user.schoolId,
      title: body.title,
      content: body.content,
      category: body.category,
      audienceType: body.audienceType,
      targetId: body.targetId,
      publishedById: user.id,
    });

    return NextResponse.json({ success: true, data: ann });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

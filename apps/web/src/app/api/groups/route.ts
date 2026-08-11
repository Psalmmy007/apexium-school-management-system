/**
 * GET & POST /api/groups
 *
 * GET: List school groups owned by or accessible to authenticated user.
 * POST: Create a new school group.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  createSchoolGroup,
  db,
  schoolGroups,
  groupMemberships,
} from "@apexium/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.userId, user.id));

    const groupIds = memberships.map((m) => m.groupId);

    if (groupIds.length === 0) {
      return NextResponse.json({ groups: [] });
    }

    const groupsList = await db
      .select()
      .from(schoolGroups)
      .where(eq(schoolGroups.ownerUserId, user.id));

    return NextResponse.json({ groups: groupsList });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch groups";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, slug, maxBranchesLimit } = body;

    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json({ error: "Group name and slug are required" }, { status: 400 });
    }

    const group = await createSchoolGroup({
      name,
      slug,
      ownerUserId: user.id,
      maxBranchesLimit: maxBranchesLimit ? Number(maxBranchesLimit) : undefined,
    });

    return NextResponse.json({ success: true, group });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create school group";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

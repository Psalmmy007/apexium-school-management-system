/**
 * GET /api/groups/[id]
 *
 * Fetches group details & aggregated metrics across branch campuses for authorized Group Admin.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  getGroupAggregatedMetrics,
  assertGroupAdminAccess,
} from "@apexium/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groupId = params.id;
    await assertGroupAdminAccess(user.id, groupId);

    const metrics = await getGroupAggregatedMetrics(groupId);

    return NextResponse.json({ metrics });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch group metrics";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

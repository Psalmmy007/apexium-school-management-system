/**
 * POST /api/groups/[id]/branches
 *
 * Provisions a new branch campus attached to the specified School Group.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  addBranchToGroup,
  assertGroupAdminAccess,
} from "@apexium/db";

export async function POST(
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

    const body = await req.json();
    const { branchName, adminFirstName, adminLastName, adminEmail, isHeadquarters } = body;

    if (!branchName?.trim() || !adminEmail?.trim()) {
      return NextResponse.json({ error: "Branch name and admin email are required" }, { status: 400 });
    }

    const branch = await addBranchToGroup({
      groupId,
      branchName,
      adminFirstName: adminFirstName || "Admin",
      adminLastName: adminLastName || "Branch",
      adminEmail,
      isHeadquarters: Boolean(isHeadquarters),
    });

    return NextResponse.json({ success: true, branch });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to add branch to group";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

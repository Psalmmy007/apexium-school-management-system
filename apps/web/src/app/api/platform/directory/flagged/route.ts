import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, verifyPlatformOperator } from "@/lib/auth/session";
import { db, schools } from "@apexium/db";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOperator = await verifyPlatformOperator(user);
    if (!isOperator || user.role !== "platform_operator") {
      return NextResponse.json(
        { error: "Forbidden: Platform Operator authorization required" },
        { status: 403 }
      );
    }

    const flaggedListings = await db
      .select({
        id: schools.id,
        name: schools.name,
        slug: schools.slug,
        email: schools.email,
        phone: schools.phone,
        address: schools.address,
        state: schools.state,
        city: schools.city,
        schoolType: schools.schoolType,
        listingStatus: schools.listingStatus,
        listingVerified: schools.listingVerified,
        flaggedDomainMismatch: schools.flaggedDomainMismatch,
        flagReason: schools.flagReason,
        createdAt: schools.createdAt,
      })
      .from(schools)
      .where(eq(schools.flaggedDomainMismatch, true));

    return NextResponse.json({ flaggedListings });
  } catch (error: any) {
    console.error("Error fetching flagged listings:", error);
    return NextResponse.json({ error: "Failed to fetch flagged listings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOperator = await verifyPlatformOperator(user);
    if (!isOperator || user.role !== "platform_operator") {
      return NextResponse.json(
        { error: "Forbidden: Platform Operator authorization required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { schoolId, action } = body; // action: 'approve' | 'reject'

    if (!schoolId) {
      return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    if (action === "approve") {
      const [updated] = await db
        .update(schools)
        .set({
          flaggedDomainMismatch: false,
          flagReason: "Manually approved by Platform Operator",
          updatedAt: new Date(),
        })
        .where(eq(schools.id, schoolId))
        .returning();

      return NextResponse.json({ success: true, school: updated });
    } else if (action === "reject") {
      const [updated] = await db
        .update(schools)
        .set({
          isActive: false,
          flagReason: "Rejected by Platform Operator due to unverified ownership",
          updatedAt: new Date(),
        })
        .where(eq(schools.id, schoolId))
        .returning();

      return NextResponse.json({ success: true, school: updated });
    } else {
      return NextResponse.json({ error: "Invalid action. Use 'approve' or 'reject'." }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error updating flagged listing:", error);
    return NextResponse.json({ error: "Failed to update flagged listing" }, { status: 500 });
  }
}

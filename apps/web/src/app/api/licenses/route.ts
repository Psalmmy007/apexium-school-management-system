import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  validateSchoolLicense,
  upgradeSchoolLicense,
  issueSchoolLicense,
  db,
  students,
} from "@apexium/db";
import { eq, count } from "drizzle-orm";

// ── GET /api/licenses — Fetch school license & seat usage ─────
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const validation = await validateSchoolLicense(user.schoolId);
    let licRecord = validation.license;
    if (!licRecord) {
      licRecord = await issueSchoolLicense({ schoolId: user.schoolId, tier: "starter" });
    }

    // Count current active students
    const [studentCountResult] = await db
      .select({ value: count() })
      .from(students)
      .where(eq(students.schoolId, user.schoolId));

    const usedSeats = Number(studentCountResult?.value || 0);

    const seatCap = licRecord.maxStudents ?? 250;
    const formattedLicense = {
      id: licRecord.id,
      schoolId: licRecord.schoolId,
      licenseKey: licRecord.key || "APX-STARTER-DEFAULT",
      tier: licRecord.tier === "growth" ? "professional" : licRecord.tier,
      status: licRecord.status,
      seatCap,
      enabledModules: (licRecord.enabledModules as string[]) || ["core_erp"],
      expiresAt: licRecord.expiresAt ? new Date(licRecord.expiresAt).toISOString() : null,
    };

    return NextResponse.json({
      success: true,
      data: {
        license: formattedLicense,
        usedSeats,
        remainingSeats: Math.max(0, seatCap - usedSeats),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch license details" },
      { status: 500 }
    );
  }
}

// ── POST /api/licenses — Upgrade tier or activate license ─────
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, targetTier } = body;

    if (action === "upgrade" && targetTier) {
      if (!["starter", "professional", "enterprise"].includes(targetTier)) {
        return NextResponse.json({ success: false, error: "Invalid license tier" }, { status: 400 });
      }

      const mappedTier = targetTier === "professional" ? "growth" : targetTier;
      const updatedLicense = await upgradeSchoolLicense(user.schoolId, mappedTier as any);
      
      const [studentCountResult] = await db
        .select({ value: count() })
        .from(students)
        .where(eq(students.schoolId, user.schoolId));

      const usedSeats = Number(studentCountResult?.value || 0);

      const seatCap = updatedLicense.maxStudents ?? 250;
      const formattedLicense = {
        id: updatedLicense.id,
        schoolId: updatedLicense.schoolId,
        licenseKey: (updatedLicense as any).key || "APX-DEMO-LICENSE",
        tier: updatedLicense.tier === "growth" ? "professional" : updatedLicense.tier,
        status: updatedLicense.status,
        seatCap,
        enabledModules: (updatedLicense.enabledModules as string[]) || ["core_erp"],
        expiresAt: updatedLicense.expiresAt ? new Date(updatedLicense.expiresAt).toISOString() : null,
      };

      return NextResponse.json({
        success: true,
        data: {
          license: formattedLicense,
          usedSeats,
          remainingSeats: Math.max(0, seatCap - usedSeats),
        },
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process license request" },
      { status: 500 }
    );
  }
}

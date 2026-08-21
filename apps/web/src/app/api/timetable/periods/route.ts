import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  getPeriodsForSchool,
  seedStandard8Periods,
  createPeriod,
  updatePeriod,
  deletePeriod,
} from "@apexium/db";

export const dynamic = "force-dynamic";

// ── GET /api/timetable/periods ── List periods for school
export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const periodsList = await getPeriodsForSchool(user.schoolId);
    return NextResponse.json({
      success: true,
      data: periodsList,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch periods" },
      { status: 500 }
    );
  }
}

// ── POST /api/timetable/periods ── Create custom period OR seed standard 8 periods
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !user.schoolId || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized. Admin only." }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (body.action === "seed_standard_8") {
      const seeded = await seedStandard8Periods(user.schoolId, body.overwrite ?? false);
      return NextResponse.json({
        success: true,
        message: "Standard 8-period schedule configured successfully.",
        data: seeded,
      });
    }

    const { name, startTime, endTime, sortOrder } = body;
    if (!name || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: "Period name, start time, and end time are required." },
        { status: 400 }
      );
    }

    const created = await createPeriod({
      schoolId: user.schoolId,
      name,
      startTime,
      endTime,
      sortOrder: sortOrder ? Number(sortOrder) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Period "${name}" created successfully.`,
      data: created,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create period" },
      { status: 400 }
    );
  }
}

// ── PUT /api/timetable/periods ── Update period details
export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !user.schoolId || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized. Admin only." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { periodId, name, startTime, endTime, sortOrder } = body;

    if (!periodId) {
      return NextResponse.json(
        { success: false, error: "Period ID is required." },
        { status: 400 }
      );
    }

    const updated = await updatePeriod({
      schoolId: user.schoolId,
      periodId,
      name,
      startTime,
      endTime,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Period updated successfully.",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update period" },
      { status: 400 }
    );
  }
}

// ── DELETE /api/timetable/periods?id=... ── Delete period
export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !user.schoolId || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized. Admin only." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const periodId = searchParams.get("id");

  if (!periodId) {
    return NextResponse.json(
      { success: false, error: "Period ID is required." },
      { status: 400 }
    );
  }

  try {
    await deletePeriod(user.schoolId, periodId);
    return NextResponse.json({
      success: true,
      message: "Period deleted successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete period" },
      { status: 400 }
    );
  }
}

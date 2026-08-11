import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { registerVehicle, db, transportVehicles } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db
      .select()
      .from(transportVehicles)
      .where(eq(transportVehicles.schoolId, user.schoolId))
      .orderBy(desc(transportVehicles.createdAt));

    return NextResponse.json({ success: true, data: list });
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
    const vehicle = await registerVehicle({
      schoolId: user.schoolId,
      registrationNumber: body.registrationNumber,
      fleetNumber: body.fleetNumber,
      make: body.make,
      model: body.model,
      manufactureYear: body.manufactureYear ? parseInt(body.manufactureYear, 10) : undefined,
      color: body.color,
      seatingCapacity: body.seatingCapacity ? parseInt(body.seatingCapacity, 10) : 30,
      currentMileage: body.currentMileage ? parseInt(body.currentMileage, 10) : 0,
      insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : undefined,
      roadWorthinessExpiry: body.roadWorthinessExpiry ? new Date(body.roadWorthinessExpiry) : undefined,
      inspectionExpiry: body.inspectionExpiry ? new Date(body.inspectionExpiry) : undefined,
      trackerInstalled: Boolean(body.trackerInstalled),
    });

    return NextResponse.json({ success: true, data: vehicle });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

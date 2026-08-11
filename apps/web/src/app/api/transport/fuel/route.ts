import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { recordFuelPurchase, db, transportFuelLogs, transportVehicles } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs = await db
      .select({
        id: transportFuelLogs.id,
        litres: transportFuelLogs.litres,
        totalCost: transportFuelLogs.totalCost,
        pricePerLitre: transportFuelLogs.pricePerLitre,
        odometer: transportFuelLogs.odometer,
        stationName: transportFuelLogs.stationName,
        receiptReference: transportFuelLogs.receiptReference,
        createdAt: transportFuelLogs.createdAt,
        vehicleNumber: transportVehicles.registrationNumber,
      })
      .from(transportFuelLogs)
      .leftJoin(transportVehicles, eq(transportFuelLogs.vehicleId, transportVehicles.id))
      .where(eq(transportFuelLogs.schoolId, user.schoolId))
      .orderBy(desc(transportFuelLogs.createdAt));

    return NextResponse.json({ success: true, data: logs });
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
    const log = await recordFuelPurchase({
      schoolId: user.schoolId,
      vehicleId: body.vehicleId,
      litres: parseFloat(body.litres),
      totalCost: parseFloat(body.totalCost),
      odometer: parseInt(body.odometer, 10),
      stationName: body.stationName,
      receiptReference: body.receiptReference,
      filledBy: user.id,
    });

    return NextResponse.json({ success: true, data: log });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

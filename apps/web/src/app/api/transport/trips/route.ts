import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { startTrip, boardStudent, dropStudent, completeTrip, db, transportDailyTrips, transportRoutes, transportVehicles, transportDrivers } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const trips = await db
      .select({
        id: transportDailyTrips.id,
        tripType: transportDailyTrips.tripType,
        tripDate: transportDailyTrips.tripDate,
        departureTime: transportDailyTrips.departureTime,
        arrivalTime: transportDailyTrips.arrivalTime,
        status: transportDailyTrips.status,
        remarks: transportDailyTrips.remarks,
        routeName: transportRoutes.routeName,
        vehicleNumber: transportVehicles.registrationNumber,
        driverName: transportDrivers.fullName,
      })
      .from(transportDailyTrips)
      .leftJoin(transportRoutes, eq(transportDailyTrips.routeId, transportRoutes.id))
      .leftJoin(transportVehicles, eq(transportDailyTrips.vehicleId, transportVehicles.id))
      .leftJoin(transportDrivers, eq(transportDailyTrips.driverId, transportDrivers.id))
      .where(eq(transportDailyTrips.schoolId, user.schoolId))
      .orderBy(desc(transportDailyTrips.createdAt));

    return NextResponse.json({ success: true, data: trips });
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
    const action = body.action || "start";

    if (action === "start") {
      const trip = await startTrip({
        schoolId: user.schoolId,
        routeId: body.routeId,
        tripType: body.tripType,
        tripDate: body.tripDate,
      });
      return NextResponse.json({ success: true, data: trip });
    }

    if (action === "board") {
      const result = await boardStudent(user.schoolId, body.tripId, body.studentId, user.id);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "drop") {
      const result = await dropStudent(user.schoolId, body.tripId, body.studentId, user.id);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "complete") {
      const trip = await completeTrip(user.schoolId, body.tripId, body.remarks);
      return NextResponse.json({ success: true, data: trip });
    }

    return NextResponse.json({ success: false, error: "Invalid trip action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

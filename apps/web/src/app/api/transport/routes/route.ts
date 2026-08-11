import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createRoute, createStops, db, transportRoutes, transportRouteStops } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const routesList = await db
      .select()
      .from(transportRoutes)
      .where(eq(transportRoutes.schoolId, user.schoolId))
      .orderBy(desc(transportRoutes.createdAt));

    // Attach stops for each route
    const routesWithStops = await Promise.all(
      routesList.map(async (r) => {
        const stops = await db
          .select()
          .from(transportRouteStops)
          .where(eq(transportRouteStops.routeId, r.id))
          .orderBy(transportRouteStops.stopOrder);
        return { ...r, stops };
      })
    );

    return NextResponse.json({ success: true, data: routesWithStops });
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
    const route = await createRoute({
      schoolId: user.schoolId,
      routeName: body.routeName,
      routeCode: body.routeCode,
      assignedVehicleId: body.assignedVehicleId,
      assignedDriverId: body.assignedDriverId,
      transportFee: body.transportFee ? parseFloat(body.transportFee) : 0,
      maximumStudents: body.maximumStudents ? parseInt(body.maximumStudents, 10) : 30,
      estimatedDurationMinutes: body.estimatedDurationMinutes ? parseInt(body.estimatedDurationMinutes, 10) : 45,
    });

    if (body.stops && Array.isArray(body.stops) && body.stops.length > 0) {
      await createStops(user.schoolId, route.id, body.stops);
    }

    return NextResponse.json({ success: true, data: route });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

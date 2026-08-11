import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { scheduleMaintenance, completeMaintenance, db, transportMaintenanceLogs, transportVehicles } from "@apexium/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs = await db
      .select({
        id: transportMaintenanceLogs.id,
        maintenanceType: transportMaintenanceLogs.maintenanceType,
        description: transportMaintenanceLogs.description,
        vendor: transportMaintenanceLogs.vendor,
        invoiceReference: transportMaintenanceLogs.invoiceReference,
        labourCost: transportMaintenanceLogs.labourCost,
        partsCost: transportMaintenanceLogs.partsCost,
        totalCost: transportMaintenanceLogs.totalCost,
        nextServiceMileage: transportMaintenanceLogs.nextServiceMileage,
        nextServiceDate: transportMaintenanceLogs.nextServiceDate,
        createdAt: transportMaintenanceLogs.createdAt,
        vehicleNumber: transportVehicles.registrationNumber,
      })
      .from(transportMaintenanceLogs)
      .leftJoin(transportVehicles, eq(transportMaintenanceLogs.vehicleId, transportVehicles.id))
      .where(eq(transportMaintenanceLogs.schoolId, user.schoolId))
      .orderBy(desc(transportMaintenanceLogs.createdAt));

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
    if (body.action === "complete") {
      const vehicle = await completeMaintenance(user.schoolId, body.vehicleId);
      return NextResponse.json({ success: true, data: vehicle });
    }

    const log = await scheduleMaintenance({
      schoolId: user.schoolId,
      vehicleId: body.vehicleId,
      maintenanceType: body.maintenanceType,
      description: body.description,
      vendor: body.vendor,
      invoiceReference: body.invoiceReference,
      labourCost: body.labourCost ? parseFloat(body.labourCost) : 0,
      partsCost: body.partsCost ? parseFloat(body.partsCost) : 0,
      nextServiceMileage: body.nextServiceMileage ? parseInt(body.nextServiceMileage, 10) : undefined,
      nextServiceDate: body.nextServiceDate ? new Date(body.nextServiceDate) : undefined,
      performedById: user.id,
    });

    return NextResponse.json({ success: true, data: log });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

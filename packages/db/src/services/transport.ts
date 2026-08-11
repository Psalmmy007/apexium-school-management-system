import {
  db,
  transportVehicles,
  transportDrivers,
  transportRoutes,
  transportRouteStops,
  transportAssignments,
  transportDailyTrips,
  transportAttendance,
  transportMaintenanceLogs,
  transportFuelLogs,
  students,
  users,
  feeInvoices,
  feeStructures,
} from "../index";
import { eq, and, sql, inArray, gte, lte, desc } from "drizzle-orm";

// ── 1. Fleet Management ─────────────────────────────────────
export async function registerVehicle(data: {
  schoolId: string;
  registrationNumber: string;
  fleetNumber?: string;
  make?: string;
  model?: string;
  manufactureYear?: number;
  color?: string;
  seatingCapacity: number;
  currentMileage?: number;
  insuranceExpiry?: Date;
  roadWorthinessExpiry?: Date;
  inspectionExpiry?: Date;
  trackerInstalled?: boolean;
}) {
  const existing = await db
    .select()
    .from(transportVehicles)
    .where(
      and(
        eq(transportVehicles.schoolId, data.schoolId),
        eq(transportVehicles.registrationNumber, data.registrationNumber.trim().toUpperCase())
      )
    );

  if (existing.length > 0) {
    throw new Error(`Vehicle with registration number "${data.registrationNumber}" already exists for this school.`);
  }

  const [vehicle] = await db
    .insert(transportVehicles)
    .values({
      schoolId: data.schoolId,
      registrationNumber: data.registrationNumber.trim().toUpperCase(),
      fleetNumber: data.fleetNumber?.trim(),
      make: data.make?.trim(),
      model: data.model?.trim(),
      manufactureYear: data.manufactureYear,
      color: data.color?.trim(),
      seatingCapacity: data.seatingCapacity,
      currentMileage: data.currentMileage || 0,
      insuranceExpiry: data.insuranceExpiry,
      roadWorthinessExpiry: data.roadWorthinessExpiry,
      inspectionExpiry: data.inspectionExpiry,
      trackerInstalled: data.trackerInstalled || false,
      status: "active",
    })
    .returning();

  return vehicle;
}

export async function updateVehicle(
  schoolId: string,
  vehicleId: string,
  updates: Partial<typeof transportVehicles.$inferInsert>
) {
  const [vehicle] = await db
    .update(transportVehicles)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(transportVehicles.id, vehicleId), eq(transportVehicles.schoolId, schoolId)))
    .returning();

  if (!vehicle) throw new Error("Vehicle not found or tenant mismatch.");
  return vehicle;
}

export async function retireVehicle(schoolId: string, vehicleId: string) {
  return await updateVehicle(schoolId, vehicleId, { status: "retired" });
}

// ── 2. Driver Management ────────────────────────────────────
export async function createDriver(data: {
  schoolId: string;
  fullName: string;
  phone: string;
  email?: string;
  licenceNumber: string;
  licenceExpiry: Date;
  emergencyContact?: string;
  linkedStaffId?: string;
  medicalFitnessExpiry?: Date;
}) {
  const [driver] = await db
    .insert(transportDrivers)
    .values({
      schoolId: data.schoolId,
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim(),
      licenceNumber: data.licenceNumber.trim(),
      licenceExpiry: data.licenceExpiry,
      emergencyContact: data.emergencyContact?.trim(),
      linkedStaffId: data.linkedStaffId,
      medicalFitnessExpiry: data.medicalFitnessExpiry,
      employmentStatus: "active",
    })
    .returning();

  return driver;
}

export async function assignDriverToVehicle(schoolId: string, vehicleId: string, driverId: string) {
  // Verify driver
  const [driver] = await db
    .select()
    .from(transportDrivers)
    .where(and(eq(transportDrivers.id, driverId), eq(transportDrivers.schoolId, schoolId)));

  if (!driver || driver.employmentStatus !== "active") {
    throw new Error("Driver is inactive or not found.");
  }

  return await updateVehicle(schoolId, vehicleId, { assignedDriverId: driverId });
}

export async function detectExpiringLicences(schoolId: string, daysAhead = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);

  const drivers = await db
    .select()
    .from(transportDrivers)
    .where(
      and(
        eq(transportDrivers.schoolId, schoolId),
        eq(transportDrivers.employmentStatus, "active"),
        lte(transportDrivers.licenceExpiry, cutoff)
      )
    );

  return drivers;
}

// ── 3. Route & Stop Management ──────────────────────────────
export async function createRoute(data: {
  schoolId: string;
  routeName: string;
  routeCode: string;
  assignedVehicleId?: string;
  assignedDriverId?: string;
  transportFee?: number;
  maximumStudents?: number;
  estimatedDurationMinutes?: number;
}) {
  const existing = await db
    .select()
    .from(transportRoutes)
    .where(
      and(
        eq(transportRoutes.schoolId, data.schoolId),
        eq(transportRoutes.routeCode, data.routeCode.trim().toUpperCase())
      )
    );

  if (existing.length > 0) {
    throw new Error(`Route code "${data.routeCode}" already exists.`);
  }

  const [route] = await db
    .insert(transportRoutes)
    .values({
      schoolId: data.schoolId,
      routeName: data.routeName.trim(),
      routeCode: data.routeCode.trim().toUpperCase(),
      assignedVehicleId: data.assignedVehicleId,
      assignedDriverId: data.assignedDriverId,
      transportFee: data.transportFee || 0,
      maximumStudents: data.maximumStudents || 30,
      estimatedDurationMinutes: data.estimatedDurationMinutes || 45,
      status: "active",
    })
    .returning();

  return route;
}

export async function createStops(
  schoolId: string,
  routeId: string,
  stops: Array<{
    stopName: string;
    stopOrder: number;
    pickupTime?: string;
    dropoffTime?: string;
    latitude?: number;
    longitude?: number;
  }>
) {
  // Verify route tenant
  const [route] = await db
    .select()
    .from(transportRoutes)
    .where(and(eq(transportRoutes.id, routeId), eq(transportRoutes.schoolId, schoolId)));

  if (!route) throw new Error("Route not found or tenant mismatch.");

  const created = [];
  for (const s of stops) {
    const [stop] = await db
      .insert(transportRouteStops)
      .values({
        schoolId,
        routeId,
        stopName: s.stopName.trim(),
        stopOrder: s.stopOrder,
        pickupTime: s.pickupTime,
        dropoffTime: s.dropoffTime,
        latitude: s.latitude,
        longitude: s.longitude,
      })
      .returning();
    created.push(stop);
  }

  return created;
}

export async function optimiseStopOrdering(schoolId: string, routeId: string) {
  const stops = await db
    .select()
    .from(transportRouteStops)
    .where(and(eq(transportRouteStops.routeId, routeId), eq(transportRouteStops.schoolId, schoolId)))
    .orderBy(transportRouteStops.stopOrder);

  // Re-index stopOrder 1..N
  for (let i = 0; i < stops.length; i++) {
    await db
      .update(transportRouteStops)
      .set({ stopOrder: i + 1, updatedAt: new Date() })
      .where(eq(transportRouteStops.id, stops[i].id));
  }

  return await db
    .select()
    .from(transportRouteStops)
    .where(and(eq(transportRouteStops.routeId, routeId), eq(transportRouteStops.schoolId, schoolId)))
    .orderBy(transportRouteStops.stopOrder);
}

// ── 4. Student Allocation with Capacity Enforcement ─────────
export async function assignStudentToRoute(data: {
  schoolId: string;
  studentId: string;
  routeId: string;
  stopId?: string;
  tripType?: "Morning" | "Afternoon" | "Both";
}) {
  const { schoolId, studentId, routeId, stopId, tripType = "Both" } = data;

  // 1. Verify student exists and is active
  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)));

  if (!student) throw new Error("Student not found or tenant mismatch.");
  if (student.status !== "active") {
    throw new Error(`Cannot assign inactive/suspended student "${student.firstName} ${student.lastName}" to transport.`);
  }

  // 2. Verify route and status
  const [route] = await db
    .select()
    .from(transportRoutes)
    .where(and(eq(transportRoutes.id, routeId), eq(transportRoutes.schoolId, schoolId)));

  if (!route || route.status !== "active") {
    throw new Error("Transport route is inactive or not found.");
  }

  // 3. Verify vehicle if assigned to route (must not be retired)
  if (route.assignedVehicleId) {
    const [vehicle] = await db
      .select()
      .from(transportVehicles)
      .where(eq(transportVehicles.id, route.assignedVehicleId));
    if (vehicle && vehicle.status === "retired") {
      throw new Error("Cannot assign student to route with a retired vehicle.");
    }
  }

  // 4. Check duplicate active assignment
  const existingAssignments = await db
    .select()
    .from(transportAssignments)
    .where(
      and(
        eq(transportAssignments.schoolId, schoolId),
        eq(transportAssignments.studentId, studentId),
        eq(transportAssignments.active, true)
      )
    );

  if (existingAssignments.length > 0) {
    throw new Error(`Student ${student.firstName} ${student.lastName} already has an active transport route assignment.`);
  }

  // 5. Enforce Vehicle / Route Capacity
  const activeRouteAssignments = await db
    .select()
    .from(transportAssignments)
    .where(
      and(
        eq(transportAssignments.schoolId, schoolId),
        eq(transportAssignments.routeId, routeId),
        eq(transportAssignments.active, true)
      )
    );

  if (activeRouteAssignments.length >= route.maximumStudents) {
    throw new Error(`Route "${route.routeName}" has reached its maximum student capacity limit of ${route.maximumStudents}.`);
  }

  // 6. Create Assignment
  const [assignment] = await db
    .insert(transportAssignments)
    .values({
      schoolId,
      studentId,
      routeId,
      stopId,
      tripType,
      active: true,
    })
    .returning();

  // 7. Auto-generate Transport Fee Invoice if route has fee > 0
  if (route.transportFee > 0) {
    try {
      const [feeStruct] = await db
        .select({ id: feeStructures.id })
        .from(feeStructures)
        .where(eq(feeStructures.schoolId, schoolId))
        .limit(1);

      if (feeStruct) {
        await db.insert(feeInvoices).values({
          schoolId,
          studentId,
          feeStructureId: feeStruct.id,
          totalAmount: route.transportFee,
          amountPaid: 0,
          outstandingBalance: route.transportFee,
          status: "unpaid",
        }).onConflictDoNothing();
      }
    } catch {
      // Fee invoice fallback
    }
  }

  return assignment;
}

// ── 5. Daily Operations & Attendance ────────────────────────
export async function startTrip(data: {
  schoolId: string;
  routeId: string;
  tripType?: "morning_pickup" | "afternoon_dropoff";
  tripDate?: string;
}) {
  const { schoolId, routeId, tripType = "morning_pickup", tripDate = new Date().toISOString().slice(0, 10) } = data;

  const [route] = await db
    .select()
    .from(transportRoutes)
    .where(and(eq(transportRoutes.id, routeId), eq(transportRoutes.schoolId, schoolId)));

  if (!route) throw new Error("Route not found.");

  const [trip] = await db
    .insert(transportDailyTrips)
    .values({
      schoolId,
      routeId,
      vehicleId: route.assignedVehicleId,
      driverId: route.assignedDriverId,
      tripType,
      tripDate,
      departureTime: new Date(),
      status: "In Progress",
    })
    .returning();

  return trip;
}

export async function boardStudent(schoolId: string, tripId: string, studentId: string, recordedBy: string) {
  const [trip] = await db
    .select()
    .from(transportDailyTrips)
    .where(and(eq(transportDailyTrips.id, tripId), eq(transportDailyTrips.schoolId, schoolId)));

  if (!trip) throw new Error("Trip not found.");

  const [record] = await db
    .insert(transportAttendance)
    .values({
      schoolId,
      tripId,
      studentId,
      boardedAt: new Date(),
      boardedBy: recordedBy,
    })
    .onConflictDoNothing()
    .returning();

  return record || { message: "Already boarded." };
}

export async function dropStudent(schoolId: string, tripId: string, studentId: string, recordedBy: string) {
  const [record] = await db
    .update(transportAttendance)
    .set({
      droppedAt: new Date(),
      droppedBy: recordedBy,
    })
    .where(
      and(
        eq(transportAttendance.tripId, tripId),
        eq(transportAttendance.studentId, studentId),
        eq(transportAttendance.schoolId, schoolId)
      )
    )
    .returning();

  return record;
}

export async function completeTrip(schoolId: string, tripId: string, remarks?: string) {
  const [trip] = await db
    .update(transportDailyTrips)
    .set({
      status: "Completed",
      arrivalTime: new Date(),
      remarks,
      updatedAt: new Date(),
    })
    .where(and(eq(transportDailyTrips.id, tripId), eq(transportDailyTrips.schoolId, schoolId)))
    .returning();

  return trip;
}

// ── 6. Maintenance Engine ───────────────────────────────────
export async function scheduleMaintenance(data: {
  schoolId: string;
  vehicleId: string;
  maintenanceType: string;
  description: string;
  vendor?: string;
  invoiceReference?: string;
  labourCost?: number;
  partsCost?: number;
  nextServiceMileage?: number;
  nextServiceDate?: Date;
  performedById?: string;
}) {
  const totalCost = (data.labourCost || 0) + (data.partsCost || 0);

  const [log] = await db
    .insert(transportMaintenanceLogs)
    .values({
      schoolId: data.schoolId,
      vehicleId: data.vehicleId,
      maintenanceType: data.maintenanceType,
      description: data.description.trim(),
      vendor: data.vendor?.trim(),
      invoiceReference: data.invoiceReference?.trim(),
      labourCost: data.labourCost || 0,
      partsCost: data.partsCost || 0,
      totalCost,
      nextServiceMileage: data.nextServiceMileage,
      nextServiceDate: data.nextServiceDate,
      performedById: data.performedById,
    })
    .returning();

  // Update vehicle status to maintenance
  await updateVehicle(data.schoolId, data.vehicleId, { status: "maintenance" });

  return log;
}

export async function completeMaintenance(schoolId: string, vehicleId: string) {
  return await updateVehicle(schoolId, vehicleId, { status: "active" });
}

// ── 7. Fuel Engine ──────────────────────────────────────────
export async function recordFuelPurchase(data: {
  schoolId: string;
  vehicleId: string;
  litres: number;
  totalCost: number;
  odometer: number;
  stationName?: string;
  receiptReference?: string;
  filledBy?: string;
}) {
  const pricePerLitre = data.totalCost / data.litres;

  const [log] = await db
    .insert(transportFuelLogs)
    .values({
      schoolId: data.schoolId,
      vehicleId: data.vehicleId,
      litres: data.litres,
      totalCost: data.totalCost,
      pricePerLitre,
      odometer: data.odometer,
      stationName: data.stationName?.trim(),
      receiptReference: data.receiptReference?.trim(),
      filledBy: data.filledBy,
    })
    .returning();

  // Update vehicle odometer mileage
  await updateVehicle(data.schoolId, data.vehicleId, { currentMileage: data.odometer });

  return log;
}

// ── 8. Parent Portal Integration Helper ──────────────────────
export async function getStudentParentTransportView(schoolId: string, studentId: string) {
  const [assignment] = await db
    .select({
      assignmentId: transportAssignments.id,
      tripType: transportAssignments.tripType,
      assignedDate: transportAssignments.assignedDate,
      routeName: transportRoutes.routeName,
      routeCode: transportRoutes.routeCode,
      stopName: transportRouteStops.stopName,
      pickupTime: transportRouteStops.pickupTime,
      dropoffTime: transportRouteStops.dropoffTime,
      vehicleNumber: transportVehicles.registrationNumber,
      driverName: transportDrivers.fullName,
      driverPhone: transportDrivers.phone,
    })
    .from(transportAssignments)
    .leftJoin(transportRoutes, eq(transportAssignments.routeId, transportRoutes.id))
    .leftJoin(transportRouteStops, eq(transportAssignments.stopId, transportRouteStops.id))
    .leftJoin(transportVehicles, eq(transportRoutes.assignedVehicleId, transportVehicles.id))
    .leftJoin(transportDrivers, eq(transportRoutes.assignedDriverId, transportDrivers.id))
    .where(
      and(
        eq(transportAssignments.schoolId, schoolId),
        eq(transportAssignments.studentId, studentId),
        eq(transportAssignments.active, true)
      )
    );

  if (!assignment) return null;

  // Get today's trip status
  const today = new Date().toISOString().slice(0, 10);
  const [todayTrip] = await db
    .select()
    .from(transportDailyTrips)
    .where(
      and(
        eq(transportDailyTrips.schoolId, schoolId),
        eq(transportDailyTrips.tripDate, today)
      )
    )
    .orderBy(desc(transportDailyTrips.createdAt));

  return {
    ...assignment,
    todayTripStatus: todayTrip ? todayTrip.status : "Scheduled",
  };
}

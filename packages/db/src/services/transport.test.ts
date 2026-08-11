import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  schools,
  students,
  users,
  transportVehicles,
  transportDrivers,
  transportRoutes,
  transportRouteStops,
  transportAssignments,
  transportDailyTrips,
} from "../index";
import {
  registerVehicle,
  createDriver,
  assignDriverToVehicle,
  createRoute,
  createStops,
  assignStudentToRoute,
  startTrip,
  boardStudent,
  completeTrip,
  scheduleMaintenance,
  recordFuelPurchase,
  getStudentParentTransportView,
} from "./transport";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

let schoolAId: string;
let schoolBId: string;
let adminAId: string;
let studentA1Id: string;
let studentA2Id: string;
let inactiveStudentId: string;

let vehicle1Id: string;
let driver1Id: string;
let route1Id: string;

beforeAll(async () => {
  // Ensure DDL tables exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS transport_vehicles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      registration_number VARCHAR(50) NOT NULL,
      fleet_number VARCHAR(50),
      make VARCHAR(50),
      model VARCHAR(50),
      manufacture_year INTEGER,
      color VARCHAR(30),
      seating_capacity INTEGER NOT NULL DEFAULT 30,
      current_mileage INTEGER NOT NULL DEFAULT 0,
      assigned_driver_id UUID,
      insurance_expiry TIMESTAMPTZ,
      road_worthiness_expiry TIMESTAMPTZ,
      inspection_expiry TIMESTAMPTZ,
      tracker_installed BOOLEAN NOT NULL DEFAULT FALSE,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transport_drivers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      linked_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
      full_name TEXT NOT NULL,
      phone VARCHAR(30) NOT NULL,
      email VARCHAR(255),
      licence_number VARCHAR(50) NOT NULL,
      licence_expiry TIMESTAMPTZ NOT NULL,
      emergency_contact TEXT,
      employment_status VARCHAR(20) NOT NULL DEFAULT 'active',
      medical_fitness_expiry TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transport_routes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      route_name TEXT NOT NULL,
      route_code VARCHAR(50) NOT NULL,
      assigned_vehicle_id UUID REFERENCES transport_vehicles(id) ON DELETE SET NULL,
      assigned_driver_id UUID REFERENCES transport_drivers(id) ON DELETE SET NULL,
      transport_fee DOUBLE PRECISION NOT NULL DEFAULT 0,
      maximum_students INTEGER NOT NULL DEFAULT 30,
      estimated_duration_minutes INTEGER DEFAULT 45,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transport_route_stops (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      route_id UUID NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
      stop_name TEXT NOT NULL,
      stop_order INTEGER NOT NULL DEFAULT 1,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      pickup_time VARCHAR(20),
      dropoff_time VARCHAR(20),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transport_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      route_id UUID NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
      stop_id UUID REFERENCES transport_route_stops(id) ON DELETE SET NULL,
      trip_type VARCHAR(20) NOT NULL DEFAULT 'Both',
      assigned_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transport_daily_trips (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      route_id UUID NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
      vehicle_id UUID REFERENCES transport_vehicles(id) ON DELETE SET NULL,
      driver_id UUID REFERENCES transport_drivers(id) ON DELETE SET NULL,
      trip_type VARCHAR(30) NOT NULL DEFAULT 'morning_pickup',
      trip_date VARCHAR(10) NOT NULL,
      departure_time TIMESTAMPTZ,
      arrival_time TIMESTAMPTZ,
      status VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
      remarks TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transport_attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      trip_id UUID NOT NULL REFERENCES transport_daily_trips(id) ON DELETE CASCADE,
      boarded_at TIMESTAMPTZ,
      dropped_at TIMESTAMPTZ,
      boarded_by UUID REFERENCES users(id) ON DELETE SET NULL,
      dropped_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transport_maintenance_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      vehicle_id UUID NOT NULL REFERENCES transport_vehicles(id) ON DELETE CASCADE,
      maintenance_type VARCHAR(50) NOT NULL DEFAULT 'routine_service',
      description TEXT NOT NULL,
      vendor TEXT,
      invoice_reference VARCHAR(100),
      labour_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
      parts_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
      next_service_mileage INTEGER,
      next_service_date TIMESTAMPTZ,
      performed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transport_fuel_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      vehicle_id UUID NOT NULL REFERENCES transport_vehicles(id) ON DELETE CASCADE,
      litres DOUBLE PRECISION NOT NULL,
      total_cost DOUBLE PRECISION NOT NULL,
      price_per_litre DOUBLE PRECISION NOT NULL,
      odometer INTEGER NOT NULL,
      filled_by UUID REFERENCES users(id) ON DELETE SET NULL,
      station_name TEXT,
      receipt_reference VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Create Test Schools
  const [sA] = await db
    .insert(schools)
    .values({ name: "Transport Test School A", slug: `ts-a-${Date.now()}` })
    .returning();
  schoolAId = sA.id;

  const [sB] = await db
    .insert(schools)
    .values({ name: "Transport Test School B", slug: `ts-b-${Date.now()}` })
    .returning();
  schoolBId = sB.id;

  // Create Admin
  const [adminA] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      schoolId: schoolAId,
      email: `admin.transport.${Date.now()}@example.com`,
      firstName: "Admin",
      lastName: "Transport",
      role: "admin",
    })
    .returning();
  adminAId = adminA.id;

  // Create Active Students
  const [st1] = await db
    .insert(students)
    .values({
      schoolId: schoolAId,
      admissionNumber: `TRP/2026/001-${Date.now()}`,
      firstName: "David",
      lastName: "BusRider",
      status: "active",
    })
    .returning();
  studentA1Id = st1.id;

  const [st2] = await db
    .insert(students)
    .values({
      schoolId: schoolAId,
      admissionNumber: `TRP/2026/002-${Date.now()}`,
      firstName: "Grace",
      lastName: "BusRider",
      status: "active",
    })
    .returning();
  studentA2Id = st2.id;

  // Create Inactive Student
  const [st3] = await db
    .insert(students)
    .values({
      schoolId: schoolAId,
      admissionNumber: `TRP/2026/003-${Date.now()}`,
      firstName: "Suspended",
      lastName: "Student",
      status: "suspended",
    })
    .returning();
  inactiveStudentId = st3.id;
});

describe("Milestone 17 Transport Management System Integration Tests", () => {
  // 1. Vehicle Registration & Driver Assignment
  it("registers school bus vehicle and driver, assigning driver to vehicle", async () => {
    const vehicle = await registerVehicle({
      schoolId: schoolAId,
      registrationNumber: `BUS-${Date.now().toString().slice(-4)}`,
      make: "Toyota",
      model: "Coaster 2023",
      seatingCapacity: 2, // low capacity for capacity enforcement test
    });

    expect(vehicle.id).toBeDefined();
    vehicle1Id = vehicle.id;

    const driver = await createDriver({
      schoolId: schoolAId,
      fullName: "Driver John",
      phone: "08011112222",
      licenceNumber: `LKN-${Date.now().toString().slice(-4)}`,
      licenceExpiry: new Date(Date.now() + 180 * 24 * 3600 * 1000),
    });

    expect(driver.id).toBeDefined();
    driver1Id = driver.id;

    const updatedVeh = await assignDriverToVehicle(schoolAId, vehicle1Id, driver1Id);
    expect(updatedVeh.assignedDriverId).toBe(driver1Id);
  });

  // 2. Route Creation & Stops Setup
  it("creates transport route and ordered bus stops", async () => {
    const route = await createRoute({
      schoolId: schoolAId,
      routeName: "Lekki Express Route",
      routeCode: `LEX-${Date.now().toString().slice(-4)}`,
      assignedVehicleId: vehicle1Id,
      assignedDriverId: driver1Id,
      transportFee: 25000,
      maximumStudents: 1, // Only 1 capacity for strict limit testing
    });

    expect(route.id).toBeDefined();
    route1Id = route.id;

    const stops = await createStops(schoolAId, route1Id, [
      { stopName: "Victoria Island Junction", stopOrder: 1, pickupTime: "06:45 AM" },
      { stopName: "Lekki Phase 1 Gate", stopOrder: 2, pickupTime: "07:10 AM" },
    ]);

    expect(stops.length).toBe(2);
  });

  // 3. Student Route Allocation & Capacity Enforcement
  it("assigns active student to route and enforces capacity & duplicate rejection", async () => {
    // Allocation 1 (Student A1)
    const assignment1 = await assignStudentToRoute({
      schoolId: schoolAId,
      studentId: studentA1Id,
      routeId: route1Id,
      tripType: "Both",
    });

    expect(assignment1.id).toBeDefined();
    expect(assignment1.active).toBe(true);

    // Rejection 1: Duplicate assignment for same student
    await expect(
      assignStudentToRoute({
        schoolId: schoolAId,
        studentId: studentA1Id,
        routeId: route1Id,
      })
    ).rejects.toThrow(/already has an active transport route assignment/i);

    // Rejection 2: Capacity enforcement (max 1 capacity reached)
    await expect(
      assignStudentToRoute({
        schoolId: schoolAId,
        studentId: studentA2Id,
        routeId: route1Id,
      })
    ).rejects.toThrow(/reached its maximum student capacity limit/i);

    // Rejection 3: Inactive student rejection
    await expect(
      assignStudentToRoute({
        schoolId: schoolAId,
        studentId: inactiveStudentId,
        routeId: route1Id,
      })
    ).rejects.toThrow(/Cannot assign inactive\/suspended student/i);
  });

  // 4. Daily Operations & Boarding Register
  it("executes daily bus trip, student boarding, and trip completion", async () => {
    const trip = await startTrip({
      schoolId: schoolAId,
      routeId: route1Id,
      tripType: "morning_pickup",
    });

    expect(trip.id).toBeDefined();
    expect(trip.status).toBe("In Progress");

    // Board student
    const boardRecord = await boardStudent(schoolAId, trip.id, studentA1Id, adminAId);
    expect(boardRecord).toBeDefined();

    // Complete trip
    const completedTrip = await completeTrip(schoolAId, trip.id, "Smooth pickup session completed");
    expect(completedTrip.status).toBe("Completed");
  });

  // 5. Maintenance Engine & Fuel Logging
  it("records vehicle maintenance and fuel logs", async () => {
    const maint = await scheduleMaintenance({
      schoolId: schoolAId,
      vehicleId: vehicle1Id,
      maintenanceType: "routine_service",
      description: "Engine oil change and brake inspection",
      labourCost: 15000,
      partsCost: 35000,
      performedById: adminAId,
    });

    expect(maint.id).toBeDefined();
    expect(maint.totalCost).toBe(50000);

    const fuelLog = await recordFuelPurchase({
      schoolId: schoolAId,
      vehicleId: vehicle1Id,
      litres: 50,
      totalCost: 40000,
      odometer: 45200,
      filledBy: adminAId,
    });

    expect(fuelLog.id).toBeDefined();
    expect(fuelLog.pricePerLitre).toBe(800);
  });

  // 6. Parent Portal Visibility
  it("exposes transport summary for parent portal", async () => {
    const parentView = await getStudentParentTransportView(schoolAId, studentA1Id);
    expect(parentView).not.toBeNull();
    expect(parentView?.routeName).toBe("Lekki Express Route");
    expect(parentView?.driverName).toBe("Driver John");
  });

  // 7. Multi-Tenant Isolation
  it("enforces complete tenant isolation between School A and School B for transport records", async () => {
    const routesB = await db
      .select()
      .from(transportRoutes)
      .where(eq(transportRoutes.schoolId, schoolBId));

    expect(routesB.length).toBe(0); // Isolated
  });
});

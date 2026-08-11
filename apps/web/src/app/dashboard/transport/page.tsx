import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  db,
  transportVehicles,
  transportDrivers,
  transportRoutes,
  transportRouteStops,
  transportAssignments,
  transportDailyTrips,
  transportMaintenanceLogs,
  transportFuelLogs,
  students,
} from "@apexium/db";
import { eq, desc } from "drizzle-orm";
import type { Metadata } from "next";
import { TransportClient } from "./TransportClient";

export const metadata: Metadata = {
  title: "Transport Management System — ERP",
};

export default async function TransportDashboardPage() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    redirect("/auth/login");
  }

  let vehicles: any[] = [];
  let drivers: any[] = [];
  let routesList: any[] = [];
  let allocations: any[] = [];
  let trips: any[] = [];
  let maintenance: any[] = [];
  let fuel: any[] = [];
  let studentList: any[] = [];

  try {
    const [
      vList,
      dList,
      rList,
      aList,
      tList,
      mList,
      fList,
      sList,
    ] = await Promise.all([
      db.select().from(transportVehicles).where(eq(transportVehicles.schoolId, user.schoolId)).orderBy(desc(transportVehicles.createdAt)),
      db.select().from(transportDrivers).where(eq(transportDrivers.schoolId, user.schoolId)).orderBy(desc(transportDrivers.createdAt)),
      db.select().from(transportRoutes).where(eq(transportRoutes.schoolId, user.schoolId)).orderBy(desc(transportRoutes.createdAt)),
      db
        .select({
          id: transportAssignments.id,
          studentId: transportAssignments.studentId,
          tripType: transportAssignments.tripType,
          assignedDate: transportAssignments.assignedDate,
          active: transportAssignments.active,
          studentFirstName: students.firstName,
          studentLastName: students.lastName,
          admissionNumber: students.admissionNumber,
          routeName: transportRoutes.routeName,
          routeCode: transportRoutes.routeCode,
        })
        .from(transportAssignments)
        .leftJoin(students, eq(transportAssignments.studentId, students.id))
        .leftJoin(transportRoutes, eq(transportAssignments.routeId, transportRoutes.id))
        .where(eq(transportAssignments.schoolId, user.schoolId))
        .orderBy(desc(transportAssignments.assignedDate)),
      db
        .select({
          id: transportDailyTrips.id,
          tripType: transportDailyTrips.tripType,
          tripDate: transportDailyTrips.tripDate,
          status: transportDailyTrips.status,
          routeName: transportRoutes.routeName,
          vehicleNumber: transportVehicles.registrationNumber,
          driverName: transportDrivers.fullName,
        })
        .from(transportDailyTrips)
        .leftJoin(transportRoutes, eq(transportDailyTrips.routeId, transportRoutes.id))
        .leftJoin(transportVehicles, eq(transportDailyTrips.vehicleId, transportVehicles.id))
        .leftJoin(transportDrivers, eq(transportDailyTrips.driverId, transportDrivers.id))
        .where(eq(transportDailyTrips.schoolId, user.schoolId))
        .orderBy(desc(transportDailyTrips.createdAt)),
      db
        .select({
          id: transportMaintenanceLogs.id,
          maintenanceType: transportMaintenanceLogs.maintenanceType,
          description: transportMaintenanceLogs.description,
          vendor: transportMaintenanceLogs.vendor,
          totalCost: transportMaintenanceLogs.totalCost,
          createdAt: transportMaintenanceLogs.createdAt,
          vehicleNumber: transportVehicles.registrationNumber,
        })
        .from(transportMaintenanceLogs)
        .leftJoin(transportVehicles, eq(transportMaintenanceLogs.vehicleId, transportVehicles.id))
        .where(eq(transportMaintenanceLogs.schoolId, user.schoolId))
        .orderBy(desc(transportMaintenanceLogs.createdAt)),
      db
        .select({
          id: transportFuelLogs.id,
          litres: transportFuelLogs.litres,
          totalCost: transportFuelLogs.totalCost,
          pricePerLitre: transportFuelLogs.pricePerLitre,
          odometer: transportFuelLogs.odometer,
          createdAt: transportFuelLogs.createdAt,
          vehicleNumber: transportVehicles.registrationNumber,
        })
        .from(transportFuelLogs)
        .leftJoin(transportVehicles, eq(transportFuelLogs.vehicleId, transportVehicles.id))
        .where(eq(transportFuelLogs.schoolId, user.schoolId))
        .orderBy(desc(transportFuelLogs.createdAt)),
      db
        .select({
          id: students.id,
          firstName: students.firstName,
          lastName: students.lastName,
          admissionNumber: students.admissionNumber,
        })
        .from(students)
        .where(eq(students.schoolId, user.schoolId))
        .orderBy(desc(students.createdAt)),
    ]);

    vehicles = vList.map((v) => ({
      ...v,
      insuranceExpiry: v.insuranceExpiry ? v.insuranceExpiry.toISOString() : undefined,
      roadWorthinessExpiry: v.roadWorthinessExpiry ? v.roadWorthinessExpiry.toISOString() : undefined,
    }));
    drivers = dList.map((d) => ({
      ...d,
      licenceExpiry: d.licenceExpiry ? d.licenceExpiry.toISOString() : "",
    }));
    routesList = rList;
    allocations = aList.map((a) => ({
      ...a,
      assignedDate: a.assignedDate ? a.assignedDate.toISOString() : "",
    }));
    trips = tList;
    maintenance = mList.map((m) => ({
      ...m,
      createdAt: m.createdAt ? m.createdAt.toISOString() : "",
    }));
    fuel = fList.map((f) => ({
      ...f,
      createdAt: f.createdAt ? f.createdAt.toISOString() : "",
    }));
    studentList = sList.map((s) => ({
      id: s.id,
      name: `${s.lastName}, ${s.firstName}`,
      admissionNumber: s.admissionNumber,
    }));
  } catch (error) {
    console.error("Failed loading transport dashboard data:", error);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Transport Management System
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage school bus fleet, drivers, routes, daily trip registers, vehicle maintenance, and student allocations.
          </p>
        </div>
      </div>

      <TransportClient
        initialVehicles={vehicles}
        initialDrivers={drivers}
        initialRoutes={routesList}
        initialAllocations={allocations}
        initialTrips={trips}
        initialMaintenance={maintenance}
        initialFuel={fuel}
        userRole={user.role}
        studentList={studentList}
      />
    </div>
  );
}

"use client";

import { useState } from "react";

interface Vehicle {
  id: string;
  registrationNumber: string;
  fleetNumber?: string;
  make?: string;
  model?: string;
  seatingCapacity: number;
  currentMileage: number;
  status: string;
  insuranceExpiry?: string;
  roadWorthinessExpiry?: string;
  trackerInstalled: boolean;
}

interface Driver {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  licenceNumber: string;
  licenceExpiry: string;
  employmentStatus: string;
}

interface RouteItem {
  id: string;
  routeName: string;
  routeCode: string;
  transportFee: number;
  maximumStudents: number;
  status: string;
  stops?: Array<{ id: string; stopName: string; stopOrder: number; pickupTime?: string; dropoffTime?: string }>;
}

interface Allocation {
  id: string;
  studentId: string;
  studentFirstName?: string;
  studentLastName?: string;
  admissionNumber?: string;
  routeName?: string;
  routeCode?: string;
  tripType: string;
  assignedDate: string;
  active: boolean;
}

interface Trip {
  id: string;
  tripType: string;
  tripDate: string;
  departureTime?: string;
  status: string;
  routeName?: string;
  vehicleNumber?: string;
  driverName?: string;
}

interface MaintenanceLog {
  id: string;
  maintenanceType: string;
  description: string;
  vendor?: string;
  totalCost: number;
  createdAt: string;
  vehicleNumber?: string;
}

interface FuelLog {
  id: string;
  litres: number;
  totalCost: number;
  pricePerLitre: number;
  odometer: number;
  createdAt: string;
  vehicleNumber?: string;
}

interface Props {
  initialVehicles: Vehicle[];
  initialDrivers: Driver[];
  initialRoutes: RouteItem[];
  initialAllocations: Allocation[];
  initialTrips: Trip[];
  initialMaintenance: MaintenanceLog[];
  initialFuel: FuelLog[];
  userRole: string;
  studentList: Array<{ id: string; name: string; admissionNumber: string }>;
}

export function TransportClient({
  initialVehicles,
  initialDrivers,
  initialRoutes,
  initialAllocations,
  initialTrips,
  initialMaintenance,
  initialFuel,
  userRole,
  studentList,
}: Props) {
  const [activeTab, setActiveTab] = useState<"fleet" | "drivers" | "routes" | "operations" | "allocations" | "maintenance_fuel">("fleet");

  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [routes, setRoutes] = useState<RouteItem[]>(initialRoutes);
  const [allocations, setAllocations] = useState<Allocation[]>(initialAllocations);
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>(initialMaintenance);
  const [fuel, setFuel] = useState<FuelLog[]>(initialFuel);

  // Modals
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [regNum, setRegNum] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [capacity, setCapacity] = useState("30");
  const [insExpiry, setInsExpiry] = useState("");

  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [licenceNo, setLicenceNo] = useState("");
  const [licenceExp, setLicenceExp] = useState("");

  const [showRouteModal, setShowRouteModal] = useState(false);
  const [rName, setRName] = useState("");
  const [rCode, setRCode] = useState("");
  const [rFee, setRFee] = useState("15000");
  const [rCap, setRCap] = useState("30");

  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selStudent, setSelStudent] = useState(studentList[0]?.id || "");
  const [selRoute, setSelRoute] = useState(routes[0]?.id || "");
  const [tripType, setTripType] = useState<"Morning" | "Afternoon" | "Both">("Both");
  const [allocError, setAllocError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  // Expiring Drivers Warning Filter
  const expiringDrivers = drivers.filter((d) => {
    if (!d.licenceExpiry) return false;
    const diffDays = (new Date(d.licenceExpiry).getTime() - Date.now()) / (1000 * 3600 * 24);
    return diffDays <= 30;
  });

  const handleRegisterVehicle = async () => {
    if (!regNum.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/transport/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationNumber: regNum,
          make: makeModel,
          seatingCapacity: parseInt(capacity, 10),
          insuranceExpiry: insExpiry || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setVehicles((prev) => [json.data, ...prev]);
        setShowVehicleModal(false);
        setRegNum("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDriver = async () => {
    if (!driverName.trim() || !licenceNo.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/transport/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: driverName,
          phone: driverPhone,
          licenceNumber: licenceNo,
          licenceExpiry: licenceExp || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDrivers((prev) => [json.data, ...prev]);
        setShowDriverModal(false);
        setDriverName("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoute = async () => {
    if (!rName.trim() || !rCode.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/transport/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeName: rName,
          routeCode: rCode,
          transportFee: parseFloat(rFee),
          maximumStudents: parseInt(rCap, 10),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRoutes((prev) => [{ ...json.data, stops: [] }, ...prev]);
        setShowRouteModal(false);
        setRName("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocateStudent = async () => {
    if (!selStudent || !selRoute) return;
    setAllocError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/transport/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selStudent,
          routeId: selRoute,
          tripType,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAllocateModal(false);
        // Refresh page state
        window.location.reload();
      } else {
        setAllocError(json.error || "Failed to allocate student to route.");
      }
    } catch (e: any) {
      setAllocError(e.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Expiring Drivers Banner Alert */}
      {expiringDrivers.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-amber-900 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <p>
              <strong>Licence Expiry Alert:</strong> {expiringDrivers.length} driver(s) have driving licences expiring within 30 days ({expiringDrivers.map((d) => d.fullName).join(", ")}).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("drivers")}
            className="btn-secondary btn-xs whitespace-nowrap text-amber-900 bg-amber-100 hover:bg-amber-200"
          >
            View Drivers
          </button>
        </div>
      )}

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">🚌</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Vehicles in Fleet</p>
            <h3 className="text-xl font-bold text-slate-900">{vehicles.length}</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-lg">👨‍✈️</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Active Drivers</p>
            <h3 className="text-xl font-bold text-slate-900">{drivers.length}</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 font-bold text-lg">🗺️</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Active Routes</p>
            <h3 className="text-xl font-bold text-slate-900">{routes.length}</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-lg">🎒</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Subscribed Students</p>
            <h3 className="text-xl font-bold text-slate-900">{allocations.length}</h3>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: "fleet", label: "Bus Fleet", icon: "🚌" },
          { id: "drivers", label: "Drivers", icon: "👨‍✈️" },
          { id: "routes", label: "Routes & Stops", icon: "🗺️" },
          { id: "operations", label: "Daily Trips", icon: "🕒" },
          { id: "allocations", label: "Student Allocations", icon: "🎒" },
          { id: "maintenance_fuel", label: "Maintenance & Fuel", icon: "🔧" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === t.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 1. BUS FLEET TAB */}
      {activeTab === "fleet" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Vehicle Fleet Register</h3>
              <p className="text-xs text-slate-500">School buses, vans, seating capacity, and roadworthiness compliance.</p>
            </div>
            {userRole === "admin" && (
              <button type="button" onClick={() => setShowVehicleModal(true)} className="btn-primary btn-sm text-xs">
                + Register Bus
              </button>
            )}
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle Reg No</th>
                  <th>Make / Model</th>
                  <th>Seating Cap</th>
                  <th>Mileage</th>
                  <th>Tracker</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                      No vehicles registered in fleet yet.
                    </td>
                  </tr>
                ) : (
                  vehicles.map((v) => (
                    <tr key={v.id}>
                      <td className="font-mono text-xs font-bold text-slate-900">{v.registrationNumber}</td>
                      <td className="text-slate-700 text-xs">{v.make || "Toyota"} {v.model || "Coaster"}</td>
                      <td className="text-slate-700 text-xs">{v.seatingCapacity} seats</td>
                      <td className="text-slate-600 text-xs font-mono">{v.currentMileage.toLocaleString()} km</td>
                      <td>
                        <span className={`badge ${v.trackerInstalled ? "badge-success" : "badge-neutral"}`}>
                          {v.trackerInstalled ? "GPS Enabled" : "No Tracker"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${v.status === "active" ? "badge-success" : v.status === "maintenance" ? "badge-warning" : "badge-danger"}`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. DRIVERS TAB */}
      {activeTab === "drivers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Driver & Transport Staff Profiles</h3>
              <p className="text-xs text-slate-500">Driver details, contact numbers, and licence renewal tracking.</p>
            </div>
            {userRole === "admin" && (
              <button type="button" onClick={() => setShowDriverModal(true)} className="btn-primary btn-sm text-xs">
                + Add Driver
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {drivers.length === 0 ? (
              <div className="col-span-full py-8 text-center bg-slate-50 rounded-xl text-slate-400 text-xs">
                No drivers registered.
              </div>
            ) : (
              drivers.map((d) => (
                <div key={d.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{d.fullName}</span>
                    <span className="badge-success capitalize">{d.employmentStatus}</span>
                  </div>
                  <p className="text-slate-600">📞 Phone: {d.phone}</p>
                  <p className="text-slate-600 font-mono">🪪 Licence No: {d.licenceNumber}</p>
                  <p className="text-slate-500 text-[11px]">
                    Expires: {d.licenceExpiry ? new Date(d.licenceExpiry).toLocaleDateString("en-NG") : "N/A"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. ROUTES & STOPS TAB */}
      {activeTab === "routes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Transport Routes & Bus Stops</h3>
              <p className="text-xs text-slate-500">Manage pickup/dropoff routes, per-term fees, and ordered bus stops.</p>
            </div>
            {userRole === "admin" && (
              <button type="button" onClick={() => setShowRouteModal(true)} className="btn-primary btn-sm text-xs">
                + Create Route
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.length === 0 ? (
              <div className="col-span-full py-8 text-center bg-slate-50 rounded-xl text-slate-400 text-xs">
                No transport routes created yet.
              </div>
            ) : (
              routes.map((r) => (
                <div key={r.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-bold text-[10px] uppercase mr-2">
                        {r.routeCode}
                      </span>
                      <strong className="text-sm text-slate-900">{r.routeName}</strong>
                    </div>
                    <span className="font-bold text-emerald-700">₦{r.transportFee.toLocaleString()} / term</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Capacity: {r.maximumStudents} students max</span>
                    <span className="badge-success">Active</span>
                  </div>

                  {/* Route Stops List */}
                  {r.stops && r.stops.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 space-y-1">
                      <p className="font-semibold text-slate-700 text-[11px]">Pickup Stops Sequence:</p>
                      <div className="flex flex-wrap gap-1">
                        {r.stops.map((s) => (
                          <span key={s.id} className="px-2 py-0.5 bg-white border rounded text-[10px] text-slate-600">
                            {s.stopOrder}. {s.stopName} ({s.pickupTime || "07:00 AM"})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. DAILY TRIPS TAB */}
      {activeTab === "operations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daily Bus Trip Operations</h3>
              <p className="text-xs text-slate-500">Live morning pickup and afternoon dropoff tracking.</p>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Trip Date</th>
                  <th>Route / Type</th>
                  <th>Bus / Driver</th>
                  <th>Departure Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                      No daily trips logged today.
                    </td>
                  </tr>
                ) : (
                  trips.map((t) => (
                    <tr key={t.id}>
                      <td className="font-mono text-xs text-slate-600">{t.tripDate}</td>
                      <td className="text-xs">
                        <strong className="text-slate-800">{t.routeName || "Route 1"}</strong>
                        <span className="block text-[10px] text-slate-400 capitalize">{t.tripType.replace(/_/g, " ")}</span>
                      </td>
                      <td className="text-xs text-slate-600">
                        {t.vehicleNumber || "Bus 1"} ({t.driverName || "Driver"})
                      </td>
                      <td className="text-xs text-slate-500 font-mono">
                        {t.departureTime ? new Date(t.departureTime).toLocaleTimeString("en-NG") : "07:00 AM"}
                      </td>
                      <td>
                        <span className={`badge ${t.status === "Completed" ? "badge-success" : "badge-warning"}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. STUDENT ALLOCATIONS TAB */}
      {activeTab === "allocations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Student Transport Subscriptions</h3>
              <p className="text-xs text-slate-500">Active student route assignments with vehicle capacity validation.</p>
            </div>
            {userRole === "admin" && (
              <button type="button" onClick={() => setShowAllocateModal(true)} className="btn-primary btn-sm text-xs">
                + Subscribe Student
              </button>
            )}
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Admission No</th>
                  <th>Assigned Route</th>
                  <th>Trip Type</th>
                  <th>Subscribed Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                      No students allocated to transport routes yet.
                    </td>
                  </tr>
                ) : (
                  allocations.map((a) => (
                    <tr key={a.id}>
                      <td className="font-bold text-slate-900 text-xs">
                        {a.studentLastName}, {a.studentFirstName}
                      </td>
                      <td className="font-mono text-xs text-slate-600">{a.admissionNumber}</td>
                      <td className="text-xs font-semibold text-slate-800">{a.routeName} ({a.routeCode})</td>
                      <td className="text-xs capitalize text-slate-600">{a.tripType}</td>
                      <td className="text-xs text-slate-500">{new Date(a.assignedDate).toLocaleDateString("en-NG")}</td>
                      <td>
                        <span className="badge-success">Active Subscription</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. MAINTENANCE & FUEL TAB */}
      {activeTab === "maintenance_fuel" && (
        <div className="space-y-6">
          {/* Maintenance Logs */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Vehicle Maintenance & Repairs</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bus Reg No</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Vendor</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400 text-xs">
                        No maintenance logs recorded.
                      </td>
                    </tr>
                  ) : (
                    maintenance.map((m) => (
                      <tr key={m.id}>
                        <td className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleDateString("en-NG")}</td>
                        <td className="font-mono font-bold text-xs">{m.vehicleNumber}</td>
                        <td className="capitalize text-xs">{m.maintenanceType.replace(/_/g, " ")}</td>
                        <td className="text-xs text-slate-700">{m.description}</td>
                        <td className="text-xs text-slate-600">{m.vendor || "Auto Workshop"}</td>
                        <td className="font-bold text-xs text-red-600">₦{m.totalCost.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fuel Logs */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Fuel Expenditure Logs</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bus Reg No</th>
                    <th>Litres</th>
                    <th>Cost / Litre</th>
                    <th>Total Cost</th>
                    <th>Odometer</th>
                  </tr>
                </thead>
                <tbody>
                  {fuel.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400 text-xs">
                        No fuel logs recorded.
                      </td>
                    </tr>
                  ) : (
                    fuel.map((f) => (
                      <tr key={f.id}>
                        <td className="text-xs text-slate-500">{new Date(f.createdAt).toLocaleDateString("en-NG")}</td>
                        <td className="font-mono font-bold text-xs">{f.vehicleNumber}</td>
                        <td className="text-xs font-semibold">{f.litres} L</td>
                        <td className="text-xs text-slate-600">₦{f.pricePerLitre.toFixed(2)}</td>
                        <td className="font-bold text-xs text-slate-900">₦{f.totalCost.toLocaleString()}</td>
                        <td className="font-mono text-xs text-slate-500">{f.odometer.toLocaleString()} km</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Register Vehicle */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-slide-up">
            <h3 className="text-base font-bold text-slate-900">Register School Bus</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="label">Registration Number *</label>
                <input
                  type="text"
                  placeholder="e.g. KJA-889XY"
                  value={regNum}
                  onChange={(e) => setRegNum(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Make / Model</label>
                <input
                  type="text"
                  placeholder="e.g. Toyota Coaster 2022"
                  value={makeModel}
                  onChange={(e) => setMakeModel(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Seating Capacity *</label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowVehicleModal(false)} className="btn-ghost btn-sm">
                Cancel
              </button>
              <button type="button" onClick={handleRegisterVehicle} disabled={loading || !regNum.trim()} className="btn-primary btn-sm">
                {loading ? "Saving..." : "Register Bus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Driver */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-slide-up">
            <h3 className="text-base font-bold text-slate-900">Add Transport Driver</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="label">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Emmanuel Okon"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Phone Number *</label>
                <input
                  type="text"
                  placeholder="08030000000"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Driving Licence Number *</label>
                <input
                  type="text"
                  placeholder="e.g. LKN-998822-NG"
                  value={licenceNo}
                  onChange={(e) => setLicenceNo(e.target.value)}
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowDriverModal(false)} className="btn-ghost btn-sm">
                Cancel
              </button>
              <button type="button" onClick={handleCreateDriver} disabled={loading || !driverName.trim() || !licenceNo.trim()} className="btn-primary btn-sm">
                {loading ? "Saving..." : "Save Driver"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create Route */}
      {showRouteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-slide-up">
            <h3 className="text-base font-bold text-slate-900">Create Transport Route</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="label">Route Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ikeja - Lekki Express Route"
                  value={rName}
                  onChange={(e) => setRName(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Route Code *</label>
                <input
                  type="text"
                  placeholder="e.g. RT-01"
                  value={rCode}
                  onChange={(e) => setRCode(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Transport Fee Per Term (₦) *</label>
                <input
                  type="number"
                  value={rFee}
                  onChange={(e) => setRFee(e.target.value)}
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowRouteModal(false)} className="btn-ghost btn-sm">
                Cancel
              </button>
              <button type="button" onClick={handleCreateRoute} disabled={loading || !rName.trim() || !rCode.trim()} className="btn-primary btn-sm">
                {loading ? "Saving..." : "Create Route"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Subscribe / Allocate Student */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-slide-up">
            <h3 className="text-base font-bold text-slate-900">Subscribe Student to Route</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="label">Select Student *</label>
                <select
                  value={selStudent}
                  onChange={(e) => setSelStudent(e.target.value)}
                  className="input"
                >
                  {studentList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Select Transport Route *</label>
                <select
                  value={selRoute}
                  onChange={(e) => setSelRoute(e.target.value)}
                  className="input"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.routeName} ({r.routeCode}) — Cap: {r.maximumStudents}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Trip Service Type *</label>
                <select
                  value={tripType}
                  onChange={(e) => setTripType(e.target.value as any)}
                  className="input"
                >
                  <option value="Both">Both (Morning Pickup & Afternoon Dropoff)</option>
                  <option value="Morning">Morning Pickup Only</option>
                  <option value="Afternoon">Afternoon Dropoff Only</option>
                </select>
              </div>

              {allocError && <p className="text-xs text-red-600 font-semibold">{allocError}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAllocateModal(false)} className="btn-ghost btn-sm">
                Cancel
              </button>
              <button type="button" onClick={handleAllocateStudent} disabled={loading || !selStudent || !selRoute} className="btn-primary btn-sm">
                {loading ? "Allocating..." : "Confirm Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

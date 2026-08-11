import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.gadpsebirkwblhguxrjw:Mediocrity00%40%40%23%23@aws-1-eu-west-2.pooler.supabase.com:6543/postgres";

const sql = postgres(connectionString, { max: 1 });

async function runTransportMigration() {
  console.log("Running Milestone 17 Transport Management System DB Migration...");

  try {
    // 1. transport_vehicles
    await sql`
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
    `;

    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_veh_school_reg ON transport_vehicles(school_id, registration_number);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_transport_veh_school_status ON transport_vehicles(school_id, status);`;

    // 2. transport_drivers
    await sql`
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
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_transport_drv_school ON transport_drivers(school_id, employment_status);`;

    // 3. transport_routes
    await sql`
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
    `;

    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_rte_school_code ON transport_routes(school_id, route_code);`;

    // 4. transport_route_stops
    await sql`
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
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_transport_stop_route_order ON transport_route_stops(route_id, stop_order);`;

    // 5. transport_assignments
    await sql`
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
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_transport_assign_student ON transport_assignments(school_id, student_id, active);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_transport_assign_route ON transport_assignments(school_id, route_id, active);`;

    // 6. transport_daily_trips
    await sql`
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
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_transport_trip_school_date ON transport_daily_trips(school_id, trip_date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_transport_trip_route_date ON transport_daily_trips(route_id, trip_date);`;

    // 7. transport_attendance
    await sql`
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
    `;

    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_att_trip_student ON transport_attendance(trip_id, student_id);`;

    // 8. transport_maintenance_logs
    await sql`
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
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_transport_maint_vehicle ON transport_maintenance_logs(vehicle_id);`;

    // 9. transport_fuel_logs
    await sql`
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
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_transport_fuel_vehicle ON transport_fuel_logs(vehicle_id);`;

    console.log("✅ Milestone 17 Transport Management System Migration Successful!");
  } catch (error) {
    console.error("❌ Transport Migration Failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runTransportMigration();

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET as getLicenses, POST as upgradeLicense } from "./route";
import { POST as createStudent } from "../students/route";
import { NextRequest } from "next/server";
import { db, schools, users, licenses, students } from "@apexium/db";
import { eq } from "drizzle-orm";

let testSchoolId: string;
let testAdminId: string;

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(async () => ({
    id: testAdminId,
    schoolId: testSchoolId,
    role: "admin",
    firstName: "License",
    lastName: "Admin",
    email: "admin@licensetest.com",
  })),
}));

describe("Milestone 8: License Center API & Enforcement Tests", () => {
  beforeEach(async () => {
    // Create unique school & admin
    const timestamp = Date.now();
    const [sc] = await db
      .insert(schools)
      .values({ name: `License Test School ${timestamp}`, slug: `license-test-${timestamp}` })
      .returning();
    testSchoolId = sc.id;

    const [usr] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        schoolId: testSchoolId,
        email: `admin_${Date.now()}@licensetest.com`,
        role: "admin",
        firstName: "License",
        lastName: "Admin",
      })
      .returning();
    testAdminId = usr.id;
  });

  it("fetches school license details and seat usage", async () => {
    const req = new NextRequest("http://localhost/api/licenses");
    const res = await getLicenses(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.license).toBeDefined();
    expect(json.data.license.seatCap).toBeGreaterThan(0);
    expect(json.data.usedSeats).toBe(0);
  });

  it("upgrades license tier immediately raising seat cap and unlocking modules", async () => {
    const upgradeReq = new NextRequest("http://localhost/api/licenses", {
      method: "POST",
      body: JSON.stringify({ action: "upgrade", targetTier: "professional" }),
    });

    const res = await upgradeLicense(upgradeReq);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.license.tier).toBe("professional");
    expect(json.data.license.seatCap).toBe(1000);
    expect(json.data.license.enabledModules).toContain("cbt");
  });

  it("enforces seat cap on student creation when cap is exceeded", async () => {
    // Set a tight cap of 1 seat
    await db
      .insert(licenses)
      .values({
        schoolId: testSchoolId,
        key: `APX-TEST-${Date.now()}`,
        tier: "starter",
        maxStudents: 1,
        enabledModules: ["core_erp"],
        status: "active",
        expiresAt: new Date(Date.now() + 365 * 86400 * 1000),
      });

    // Add first student (reaches cap)
    await db.insert(students).values({
      schoolId: testSchoolId,
      admissionNumber: `ADM-${Date.now()}-1`,
      firstName: "Student",
      lastName: "One",
    });

    // Attempt creating second student via API route
    const req = new NextRequest("http://localhost/api/students", {
      method: "POST",
      body: JSON.stringify({
        admissionNumber: `ADM-${Date.now()}-2`,
        firstName: "Student",
        lastName: "Two",
      }),
    });

    const res = await createStudent(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/Student limit reached/i);
  });
});

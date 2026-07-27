import { describe, it, expect, beforeAll } from "vitest";
import {
  issueSchoolLicense,
  validateSchoolLicense,
  enforceStudentCap,
  isModuleEnabled,
  upgradeSchoolLicense,
  generateLicenseKey,
} from "./license.js";
import { db, schools, students, licenses, licenseEvents } from "../index.js";
import { eq } from "drizzle-orm";

describe("Milestone 8: License Center Integration Tests", () => {
  let schoolId: string;

  beforeAll(async () => {
    const [sch] = await db
      .insert(schools)
      .values({
        name: "Licensing Test School",
        slug: `license-sch-${Date.now()}`,
      })
      .returning();
    schoolId = sch.id;
  }, 30000);

  it("generates formatted unique license keys", () => {
    const key = generateLicenseKey();
    expect(key).toMatch(/^APX-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("issues a starter license with default 250 seat cap", async () => {
    const lic = await issueSchoolLicense({
      schoolId,
      tier: "starter",
    });

    expect(lic.id).toBeDefined();
    expect(lic.tier).toBe("starter");
    expect(lic.maxStudents).toBe(250);
    expect(lic.enabledModules).toContain("core_erp");

    // Verify audit event log
    const events = await db
      .select()
      .from(licenseEvents)
      .where(eq(licenseEvents.schoolId, schoolId));
    expect(events.some((e) => e.eventType === "issued")).toBe(true);
  });

  it("enforces student cap and rejects adding students beyond the cap", async () => {
    // 1. Create a school with a small cap of 2 students
    const [smallSch] = await db
      .insert(schools)
      .values({
        name: "Small Cap School",
        slug: `small-cap-${Date.now()}`,
      })
      .returning();

    await issueSchoolLicense({
      schoolId: smallSch.id,
      tier: "starter",
      maxStudents: 2,
    });

    // 2. Insert 2 students (at capacity)
    await db.insert(students).values([
      { schoolId: smallSch.id, admissionNumber: `STU-CAP-1-${Date.now()}`, firstName: "Student", lastName: "One" },
      { schoolId: smallSch.id, admissionNumber: `STU-CAP-2-${Date.now()}`, firstName: "Student", lastName: "Two" },
    ]);

    // 3. Attempting to add 3rd student must be rejected with clear message
    await expect(enforceStudentCap(smallSch.id)).rejects.toThrow(
      "Student limit reached: Your starter license cap is 2 students (Currently enrolled: 2). Upgrade your plan to add more students."
    );
  });

  it("upgrades license tier immediately raising caps and unlocking modules", async () => {
    const [upgradeSch] = await db
      .insert(schools)
      .values({
        name: "Upgrade Test School",
        slug: `upgrade-sch-${Date.now()}`,
      })
      .returning();

    await issueSchoolLicense({
      schoolId: upgradeSch.id,
      tier: "starter",
    });

    expect(await isModuleEnabled(upgradeSch.id, "cbt")).toBe(false);

    // Upgrade to Growth tier
    const updatedLic = await upgradeSchoolLicense(upgradeSch.id, "growth");

    expect(updatedLic.tier).toBe("growth");
    expect(updatedLic.maxStudents).toBe(1000);
    expect(await isModuleEnabled(upgradeSch.id, "cbt")).toBe(true);

    // Check upgrade audit event
    const events = await db
      .select()
      .from(licenseEvents)
      .where(eq(licenseEvents.schoolId, upgradeSch.id));
    expect(events.some((e) => e.eventType === "upgraded")).toBe(true);
  });

  it("handles expired license by blocking gated modules without losing or deleting existing data", async () => {
    const [expSch] = await db
      .insert(schools)
      .values({
        name: "Expired School",
        slug: `expired-sch-${Date.now()}`,
      })
      .returning();

    // Create an already-expired license (expired 1 day ago)
    const yesterday = new Date(Date.now() - 86400 * 1000);
    await db.insert(licenses).values({
      schoolId: expSch.id,
      key: generateLicenseKey(),
      tier: "growth",
      enabledModules: ["core_erp", "cbt"],
      maxStudents: 1000,
      status: "active",
      expiresAt: yesterday,
    });

    // Add student record before expiry
    const [stu] = await db
      .insert(students)
      .values({
        schoolId: expSch.id,
        admissionNumber: `STU-EXP-${Date.now()}`,
        firstName: "Safe",
        lastName: "Data",
      })
      .returning();

    // Validation should report invalid due to expiry
    const check = await validateSchoolLicense(expSch.id);
    expect(check.valid).toBe(false);
    expect(check.reason).toContain("License expired");

    // Existing student data must remain 100% safe and intact in the database
    const [existingStu] = await db
      .select()
      .from(students)
      .where(eq(students.id, stu.id));
    expect(existingStu).toBeDefined();
    expect(existingStu.firstName).toBe("Safe");
  });
});

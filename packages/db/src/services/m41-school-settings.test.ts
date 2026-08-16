import { describe, it, expect, beforeEach } from "vitest";
import {
  db,
  schools,
  schoolSettings,
  createSchoolWithTenant,
  getSchoolGeneralSettings,
  updateSchoolGeneralSettings,
} from "../index";
import { eq, count } from "drizzle-orm";

describe("Milestone 41: General School Settings Integrity", () => {
  let testSchoolId: string;

  beforeEach(async () => {
    const school = await createSchoolWithTenant({
      name: `Initial School Name ${Date.now()}`,
      address: "123 Old Campus Road",
      phone: "+2348011112222",
      email: "old-info@school.edu",
    });
    testSchoolId = school.id;
  });

  it("retrieves initial school profile settings", async () => {
    const settings = await getSchoolGeneralSettings(testSchoolId);
    expect(settings).not.toBeNull();
    expect(settings?.id).toBe(testSchoolId);
    expect(settings?.name).toContain("Initial School Name");
    expect(settings?.address).toBe("123 Old Campus Road");
    expect(settings?.phone).toBe("+2348011112222");
  });

  it("updates school settings in the exact same database row with no duplicates or orphaned records", async () => {
    const [initialCountRes] = await db.select({ total: count() }).from(schools);
    const initialTotalSchools = Number(initialCountRes.total);

    // Update settings
    const updated = await updateSchoolGeneralSettings(testSchoolId, {
      name: "Apexium Premier International College",
      address: "Plot 50 Lekki Expressway, Lagos",
      phone: "+234 809 999 8888",
      email: "principal@apexiumpremier.edu.ng",
      motto: "Knowledge, Discipline and Excellence",
      logoUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    });

    // 1. Verify returned updated object
    expect(updated.id).toBe(testSchoolId);
    expect(updated.name).toBe("Apexium Premier International College");
    expect(updated.address).toBe("Plot 50 Lekki Expressway, Lagos");
    expect(updated.phone).toBe("+234 809 999 8888");
    expect(updated.email).toBe("principal@apexiumpremier.edu.ng");
    expect(updated.motto).toBe("Knowledge, Discipline and Excellence");
    expect(updated.logoUrl).toContain("data:image/png;base64");

    // 2. Verify total schools count in database remained constant (no duplicate rows created)
    const [afterCountRes] = await db.select({ total: count() }).from(schools);
    expect(Number(afterCountRes.total)).toBe(initialTotalSchools);

    // 3. Query PostgreSQL directly to verify persistence
    const [dbSchool] = await db.select().from(schools).where(eq(schools.id, testSchoolId)).limit(1);
    expect(dbSchool.name).toBe("Apexium Premier International College");
    expect(dbSchool.address).toBe("Plot 50 Lekki Expressway, Lagos");
    expect(dbSchool.phone).toBe("+234 809 999 8888");
    expect(dbSchool.logoUrl).toBe(updated.logoUrl);

    // 4. Re-fetch via service function to verify consistency
    const refetched = await getSchoolGeneralSettings(testSchoolId);
    expect(refetched?.name).toBe("Apexium Premier International College");
    expect(refetched?.motto).toBe("Knowledge, Discipline and Excellence");
  });

  it("handles partial updates without overwriting existing fields", async () => {
    // Initial full update
    await updateSchoolGeneralSettings(testSchoolId, {
      name: "Existing Academy",
      address: "Campus A",
      phone: "+2348000000000",
      motto: "Legacy Motto",
    });

    // Partial update: only change motto and phone
    const partial = await updateSchoolGeneralSettings(testSchoolId, {
      motto: "Updated New Motto",
      phone: "+2348112223333",
    });

    expect(partial.name).toBe("Existing Academy");
    expect(partial.address).toBe("Campus A");
    expect(partial.phone).toBe("+2348112223333");
    expect(partial.motto).toBe("Updated New Motto");
  });
});
